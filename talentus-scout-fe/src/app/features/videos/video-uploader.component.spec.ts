import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { HttpEvent, HttpEventType, HttpResponse } from '@angular/common/http';
import { VideoUploaderComponent } from './video-uploader.component';
import { VideoUploadService } from '../../core/services/video-upload.service';
import { AthleteVideoResponse, UploadTicketResponse } from '../../core/models/video.model';

describe('VideoUploaderComponent', () => {
  let component: VideoUploaderComponent;
  let fixture: ComponentFixture<VideoUploaderComponent>;
  let videoServiceSpy: jasmine.SpyObj<VideoUploadService>;

  const mockTicket: UploadTicketResponse = {
    videoId: 'vid-123',
    directUploadUrl: 'http://localhost:8080/api/v1/videos/mock-upload/vid-123',
    providerVideoId: 'mock-vid-123',
    maxSizeBytes: 524288000
  };

  const mockVideoResponse: AthleteVideoResponse = {
    id: 'vid-123',
    athleteId: 'ath-123',
    title: 'Goles de Tiro Libre',
    category: 'GOLES',
    providerVideoId: 'mock-vid-123',
    playbackUrl: 'http://localhost:8080/uploads/videos/final.mp4',
    thumbnailUrl: 'http://localhost:8080/uploads/videos/thumb.jpg',
    durationSeconds: 45,
    status: 'READY',
    sortOrder: 1,
    createdAt: new Date().toISOString()
  };

  beforeEach(async () => {
    videoServiceSpy = jasmine.createSpyObj('VideoUploadService', [
      'requestUploadTicket',
      'uploadFileWithProgress',
      'generateLocalThumbnail',
      'dataUrlToFile',
      'getVideosByAthlete'
    ]);

    videoServiceSpy.generateLocalThumbnail.and.returnValue(Promise.resolve('data:image/jpeg;base64,fake-thumb'));
    videoServiceSpy.dataUrlToFile.and.returnValue(new File(['thumb-bytes'], 'thumb.jpg', { type: 'image/jpeg' }));
    videoServiceSpy.requestUploadTicket.and.returnValue(of(mockTicket));

    await TestBed.configureTestingModule({
      imports: [VideoUploaderComponent],
      providers: [
        { provide: VideoUploadService, useValue: videoServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VideoUploaderComponent);
    component = fixture.componentInstance;
    component.athleteId = 'ath-123';
    component.athleteName = 'Gabriel Perez';
    fixture.detectChanges();
  });

  it('should create the component with idle status', () => {
    expect(component).toBeTruthy();
    expect(component.progressState.status).toBe('idle');
  });

  it('should reject file larger than 500MB without calling upload service', () => {
    // 501 MB file
    const oversizedFile = new File([''], 'huge-match.mp4', { type: 'video/mp4' });
    Object.defineProperty(oversizedFile, 'size', { value: 524288001 });

    component.handleFile(oversizedFile);

    expect(component.progressState.status).toBe('error');
    expect(component.progressState.errorMessage).toContain('supera el límite de 500 MB');
    expect(component.selectedFile).toBeNull();
    expect(videoServiceSpy.requestUploadTicket).not.toHaveBeenCalled();
  });

  it('should reject non-video file formats', () => {
    const invalidFile = new File(['text content'], 'curriculum.pdf', { type: 'application/pdf' });

    component.handleFile(invalidFile);

    expect(component.progressState.status).toBe('error');
    expect(component.progressState.errorMessage).toContain('Formato no compatible');
    expect(component.selectedFile).toBeNull();
  });

  it('should accept valid MP4 file, extract thumbnail and enter selected state', fakeAsync(() => {
    const validFile = new File(['fake-video-bytes'], 'jugada-gol.mp4', { type: 'video/mp4' });

    component.handleFile(validFile);
    tick();

    expect(component.progressState.status).toBe('selected');
    expect(component.selectedFile).toBe(validFile);
    expect(component.videoTitle).toBe('Jugada gol');
    expect(videoServiceSpy.generateLocalThumbnail).toHaveBeenCalledWith(validFile);
    expect(component.localThumbnailUrl).toBe('data:image/jpeg;base64,fake-thumb');
  }));

  it('should request ticket and track upload progress to 100% and then emit videoUploaded', () => {
    const validFile = new File(['fake-video-bytes'], 'asistencias.mov', { type: 'video/quicktime' });
    component.handleFile(validFile);
    component.videoTitle = 'Asistencias Temporada 2026';
    component.videoCategory = 'ASISTENCIAS';

    // Simular stream de eventos HTTP
    const progressEvent: HttpEvent<any> = {
      type: HttpEventType.UploadProgress,
      loaded: 50,
      total: 100
    };

    const completionResponse = new HttpResponse<AthleteVideoResponse>({
      body: mockVideoResponse,
      status: 200
    });

    videoServiceSpy.uploadFileWithProgress.and.returnValue(of(progressEvent, completionResponse));

    let emittedVideo: AthleteVideoResponse | null = null;
    component.videoUploaded.subscribe((v) => (emittedVideo = v));

    component.startUpload();

    expect(videoServiceSpy.requestUploadTicket).toHaveBeenCalledWith({
      athleteId: 'ath-123',
      title: 'Asistencias Temporada 2026',
      category: 'ASISTENCIAS'
    });

    expect(videoServiceSpy.uploadFileWithProgress).toHaveBeenCalledWith(mockTicket.directUploadUrl, validFile, undefined);
    expect(component.progressState.status).toBe('ready');
    expect(component.lastUploadedVideo).toEqual(mockVideoResponse);
    expect(emittedVideo as any).toEqual(mockVideoResponse);
  });

  it('should include thumbnailFile when localThumbnailUrl is available', fakeAsync(() => {
    const validFile = new File(['fake-video-bytes'], 'goles.mp4', { type: 'video/mp4' });
    component.handleFile(validFile);
    tick();

    expect(component.localThumbnailUrl).toBe('data:image/jpeg;base64,fake-thumb');

    const completionResponse = new HttpResponse<AthleteVideoResponse>({
      body: mockVideoResponse,
      status: 200
    });
    videoServiceSpy.uploadFileWithProgress.and.returnValue(of(completionResponse));

    component.startUpload();

    expect(videoServiceSpy.dataUrlToFile).toHaveBeenCalledWith('data:image/jpeg;base64,fake-thumb', 'ath-123_thumb.jpg');
    expect(videoServiceSpy.uploadFileWithProgress).toHaveBeenCalledWith(
      mockTicket.directUploadUrl,
      validFile,
      jasmine.any(File)
    );
  }));

  it('should handle upload ticket error gracefully', () => {
    const validFile = new File(['bytes'], 'clip.mp4', { type: 'video/mp4' });
    component.handleFile(validFile);
    component.videoTitle = 'Gol';

    videoServiceSpy.requestUploadTicket.and.returnValue(
      throwError(() => ({ error: { message: 'Token expirado' } }))
    );

    component.startUpload();

    expect(component.progressState.status).toBe('error');
    expect(component.progressState.errorMessage).toContain('Token expirado');
  });

  it('should cancel active upload and reset to selected state', () => {
    const validFile = new File(['bytes'], 'clip.mp4', { type: 'video/mp4' });
    component.handleFile(validFile);
    component.videoTitle = 'Gol';

    videoServiceSpy.uploadFileWithProgress.and.returnValue(of()); // Never emits
    component.startUpload();

    expect(component.progressState.status).toBe('uploading');

    component.cancelCurrentUpload();

    expect(component.progressState.status).toBe('selected');
    expect(component.progressState.percentage).toBe(0);
  });
});
