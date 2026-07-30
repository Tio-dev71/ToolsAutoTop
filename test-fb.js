const axios = require('axios');

async function testFb() {
  const uids = ['4', '123456789012345']; // 4 is Zuck, 123456789012345 is likely fake/dead
  
  for (let uid of uids) {
    try {
      const res = await axios.get(`https://graph.facebook.com/${uid}/picture?type=normal`, {
        maxRedirects: 0,
        validateStatus: () => true
      });
      if (res.status === 302) {
         const location = res.headers.location;
         if (location && location.includes('100x100')) {
             console.log(`UID ${uid}: Redirected to avatar - Alive`);
         } else {
             console.log(`UID ${uid}: Redirect location: ${location}`);
         }
      } else {
         console.log(`UID ${uid}: HTTP ${res.status} - Dead?`);
      }
    } catch (err) {
      if (err.response) {
        console.log(`UID ${uid}: HTTP ${err.response.status} - Dead?`);
      } else {
        console.log(`UID ${uid}: Error - ${err.message}`);
      }
    }
  }
}

testFb();
