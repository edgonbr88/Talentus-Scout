import { HttpInterceptorFn } from '@angular/common/http';

export const serverUrlInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith('/api/')) {
    const isNode = typeof process !== 'undefined' && process.env;
    let backendOrigin = 'http://localhost:8080';

    if (isNode) {
      if (process.env['BACKEND_INTERNAL_URL']) {
        backendOrigin = process.env['BACKEND_INTERNAL_URL'];
      } else {
        // En Docker Compose dentro de talentus-net el servicio backend se llama talentus-scout-be
        backendOrigin = 'http://talentus-scout-be:8080';
      }
    }

    const cloned = req.clone({
      url: `${backendOrigin}${req.url}`
    });
    return next(cloned);
  }
  return next(req);
};
