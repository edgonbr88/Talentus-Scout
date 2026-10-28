export const environment = {
  production: false,
  apiBaseUrl: '/api/v1',
  backendOrigin: 'http://localhost:8080',
  googleClientId: '',
  microsoftClientId: '',
  microsoftRedirectUri: typeof window !== 'undefined' ? `${window.location.origin}/auth/login` : 'http://localhost/auth/login'
};
