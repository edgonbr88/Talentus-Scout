import { MediaUrlPipe, resolveAssetUrl } from './media-url.pipe';
import { environment } from '../../../environments/environment';

describe('MediaUrlPipe and resolveAssetUrl', () => {
  let pipe: MediaUrlPipe;

  beforeEach(() => {
    pipe = new MediaUrlPipe();
  });

  it('should return empty string for null, undefined or empty input', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
    expect(pipe.transform('   ')).toBe('');
  });

  it('should return absolute URLs unchanged', () => {
    expect(pipe.transform('https://example.com/photo.jpg')).toBe('https://example.com/photo.jpg');
    expect(pipe.transform('http://localhost:8080/uploads/photos/1.jpg')).toBe('http://localhost:8080/uploads/photos/1.jpg');
    expect(pipe.transform('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
    expect(pipe.transform('blob:http://localhost:4200/123')).toBe('blob:http://localhost:4200/123');
  });

  it('should prepend backendOrigin to relative /uploads/ paths when backendOrigin is defined', () => {
    const origin = (environment as { backendOrigin?: string }).backendOrigin || '';
    const res = pipe.transform('/uploads/photos/atleta.png');
    if (origin) {
      expect(res).toBe(`${origin}/uploads/photos/atleta.png`);
    } else {
      expect(res).toBe('/uploads/photos/atleta.png');
    }
  });

  it('should resolve using resolveAssetUrl function directly', () => {
    expect(resolveAssetUrl('https://cdn.talentus.app/img.webp')).toBe('https://cdn.talentus.app/img.webp');
    expect(resolveAssetUrl(null)).toBe('');
  });
});
