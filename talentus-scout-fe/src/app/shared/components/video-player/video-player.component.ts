import {
  Component,
  Input,
  ElementRef,
  ViewChild,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import Hls from 'hls.js';

@Component({
  selector: 'app-video-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.css']
})
export class VideoPlayerComponent implements OnInit, OnChanges, OnDestroy {
  @Input({ required: true }) playbackUrl!: string;
  @Input() thumbnailUrl?: string;
  @Input() title?: string;

  @ViewChild('videoElement', { static: true }) videoRef!: ElementRef<HTMLVideoElement>;

  private platformId = inject(PLATFORM_ID);
  private hls: Hls | null = null;
  public isPlaying = false;
  public isLoading = false;
  public isMuted = false;
  public hasError = false;

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initPlayer();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['playbackUrl'] && !changes['playbackUrl'].isFirstChange()) {
      if (isPlatformBrowser(this.platformId)) {
        this.destroyHls();
        this.initPlayer();
      }
    }
  }

  private initPlayer(): void {
    const video = this.videoRef?.nativeElement;
    if (!video || !this.playbackUrl) return;

    this.hasError = false;
    const isHlsSource = this.playbackUrl.includes('.m3u8') || this.playbackUrl.includes('manifest');

    if (isHlsSource && Hls.isSupported()) {
      this.hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true
      });
      this.hls.loadSource(this.playbackUrl);
      this.hls.attachMedia(video);

      this.hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              this.hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              this.hls?.recoverMediaError();
              break;
            default:
              this.destroyHls();
              this.hasError = true;
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Soporte nativo para Safari y iOS WebKit
      video.src = this.playbackUrl;
    } else {
      // Fallback para MP4 o WebM directo
      video.src = this.playbackUrl;
    }
  }

  togglePlay(): void {
    const video = this.videoRef?.nativeElement;
    if (!video) return;

    if (video.paused) {
      video.play().then(() => {
        this.isPlaying = true;
      }).catch(() => {
        this.isPlaying = false;
      });
    } else {
      video.pause();
      this.isPlaying = false;
    }
  }

  onPlay(): void {
    this.isPlaying = true;
  }

  onPause(): void {
    this.isPlaying = false;
  }

  onError(): void {
    this.hasError = true;
    this.isLoading = false;
  }

  private destroyHls(): void {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }

  ngOnDestroy(): void {
    this.destroyHls();
  }
}
