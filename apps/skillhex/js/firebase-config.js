export function getFirebaseConfig() {
  const host = window.location.hostname;
  const dev = {
    apiKey: 'DEV_API_KEY', authDomain: 'dev-skillhex.firebaseapp.com', projectId: 'dev-skillhex',
    storageBucket: 'dev-skillhex.appspot.com', messagingSenderId: '000000000000', appId: '1:000000000000:web:dev'
  };
  const prod = {
    apiKey: 'PROD_API_KEY', authDomain: 'prod-skillhex.firebaseapp.com', projectId: 'prod-skillhex',
    storageBucket: 'prod-skillhex.appspot.com', messagingSenderId: '111111111111', appId: '1:111111111111:web:prod'
  };
  return (host === 'localhost' || host.endsWith('.local')) ? dev : prod;
}
