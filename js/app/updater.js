export class Updater {
  
  constructor(url, progressCallback){
    this.url = url;
    this.uploading = false;
    this.progressCB = progressCallback;
    // this.events = new EventSource(`${url}/events`);
  }
  begin() {
    this.events = new EventSource(`${this.url}/events`);
  }
  upload(file, progressCallback) {
    if (!this.events) {
      try {
        this.begin();
      }
      catch(err) {
        console.log(err);
        return;
      }
    }
    if (progressCallback) this.progressCB = progressCallback;
    this.uploading = true;
    const formData = new FormData();
    const request = new XMLHttpRequest();

    request.addEventListener('load', () => {
      // request.response will hold the response from the server
      if (request.status === 200) {
        this.OTASuccess = true;
      } else if (request.status !== 500) {
        this.OTAError = `[HTTP ERROR] ${request.statusText}`;
      } else {
        this.OTAError = request.responseText;
      }
      this.uploading = false;
      this.progress = 0;
    });

    // Upload progress
    // request.upload.addEventListener("progress", (e) => {
    //   this.progress = Math.trunc((e.loaded / e.total) * 100);
    // });
    if (this.progressCB) request.upload.addEventListener("progress", this.progressCB);
    
    // this.events.addEventListener("updater", (e)=>{
    //   console.log(e);
    // });
    if (this.progressCB) this.events.addEventListener("updater", this.progressCB);
    if (this.progressCB) this.events.addEventListener("tarprogress", this.progressCB);

    const downgrade = document.getElementById("downgrade").checked;
    formData.append("downgrade", downgrade);
    formData.append("size", file.size);
    formData.append("firmware", file, file.name);

    request.open('post',this.url);
    request.send(formData);
  }
  end() {
    this.events.removeEventListener("updater", this.progressCB);
    this.events.removeEventListener("tarprogress", this.progressCB);
  }
}
// fileMD5(file) {
//   return new Promise((resolve, reject) => {
//     const blobSlice = File.prototype.slice
//       || File.prototype.mozSlice || File.prototype.webkitSlice;
//     const chunkSize = 2097152; // Read in chunks of 2MB
//     const chunks = Math.ceil(file.size / chunkSize);
//     const spark = new this.SparkMD5.ArrayBuffer();
//     const fileReader = new FileReader();
//     let currentChunk = 0;
//     let loadNext;

//     fileReader.onload = (e) => {
//       spark.append(e.target.result); // Append array buffer
//       currentChunk += 1;

//       if (currentChunk < chunks) {
//         loadNext();
//       } else {
//         const md5 = spark.end();
//         resolve(md5);
//       }
//     };

//     fileReader.onerror = (e) => {
//       reject(e);
//     };

//     loadNext = () => {
//       const start = currentChunk * chunkSize;
//       const end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;

//       fileReader.readAsArrayBuffer(blobSlice.call(file, start, end));
//     };

//     loadNext();
//   });
// };

// uploadOTA(event) {
//   this.uploading = true;
//   const formData = new FormData();
//   if (event !== null) {
//     [this.file] = event.target.files;
//   }
//   const request = new XMLHttpRequest();

//   request.addEventListener('load', () => {
//     // request.response will hold the response from the server
//     if (request.status === 200) {
//       this.OTASuccess = true;
//     } else if (request.status !== 500) {
//       this.OTAError = `[HTTP ERROR] ${request.statusText}`;
//     } else {
//       this.OTAError = request.responseText;
//     }
//     this.uploading = false;
//     this.progress = 0;
//   });

//   // Upload progress
//   request.upload.addEventListener('progress', (e) => {
//     this.progress = Math.trunc((e.loaded / e.total) * 100);
//   });

//   request.withCredentials = true;

//   this.fileMD5(this.file)
//     .then((md5) => {
//       formData.append('MD5', md5);
//       formData.append(this.type, this.file, this.type);
//       request.open('post', '/update');
//       request.send(formData);
//     })
//     .catch(() => {
//       this.OTAError = 'Unknown error while upload, check the console for details.';
//       this.uploading = false;
//       this.progress = 0;
//     });
// };

// retryOTA() {
//   this.OTAError = null;
//   this.OTASuccess = false;
//   this.uploadOTA(null);
// };

// clear() {
//   this.OTAError = null;
//   this.OTASuccess = false;
// };