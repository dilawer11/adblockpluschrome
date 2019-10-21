/* Copyright (C) 2019 Dilawer Ahmed
 *

/* saveContent */
'use strict';

window.count = 0;

function timeout() {
  return Number(localStorage.getItem('timeout') || 10) * 1000;
}

const downloads = {};

function Download() {
  this.zip = new JSZip();
  this.indices = {};
  this.abort = false;
}
Download.prototype.init = function(request, tab) {

  this.request = request;
  this.tab = tab;
  this.jobs = request.items;
  this.length = this.jobs.length;
  this.one();
};

Download.prototype.one = function() {
  if (this.abort) {
    return;
  }
  const id = this.tab;
  const jobs = this.jobs;
  const request = this.request;
  const [j1, j2, j3, j4, j5] = [jobs.shift(), jobs.shift(), jobs.shift(), jobs.shift(), jobs.shift()];
  if (j1) {
    Promise.all([
      j1 ? this.download(j1).catch(() => {}) : Promise.resolve(),
      j2 ? this.download(j2).catch(() => {}) : Promise.resolve(),
      j3 ? this.download(j3).catch(() => {}) : Promise.resolve(),
      j4 ? this.download(j4).catch(() => {}) : Promise.resolve(),
      j5 ? this.download(j5).catch(() => {}) : Promise.resolve()
    ]).then(() => this.one());
  }
  else {
    if (request.zip) {
      this.zip.generateAsync({type: 'blob'})
        .then(content => {
          const url = URL.createObjectURL(content);
          browser.downloads.download({
            url,
            filename: request.filename,
            conflictAction: 'uniquify',
            saveAs: request.saveAs
          }, () => {
            delete downloads[id];
            window.setTimeout(() => URL.revokeObjectURL(url), 10000);
            browser.tabs.remove(id)
          });
        });
    }
    else {
      delete downloads[id];
    }
  }
};
Download.prototype.terminate = function () {
  this.abort = true;
  this.jobs = [];
}
Download.prototype.download = function(obj) {

  const {filename, zip} = this.request;
  // console.log(this.request)
  if (zip) {
    return new Promise((resolve, reject) => {
      if (this.abort) {
        return;
      }
      // console.log("Sending Request")
      const req = new XMLHttpRequest(); // do not use fetch API as it cannot get CORS headers
      req.open('GET', obj.url);
      // console.log(obj);
      if (obj.size) {
        // for huge files, we need to alter the timeout
        req.timeout = Math.max(timeout(), timeout() * obj.size / (100 * 1024));
      }
      else{
        req.timeout = Math.max(timeout(), timeout() * 10000000000)
      }
      req.onerror = req.ontimeout = reject;
      req.responseType = 'blob';
      req.onload = () => {
        this.zip.file(obj.filename, req.response);
        resolve();
      };
      req.send();
    });
  }
  else {
    return new Promise(resolve => {
      const path = filename.split('/');
      path.pop();
      path.push(obj.filename);

      browser.downloads.download({
        url: obj.src,
        filename: path.join('/'),
        conflictAction: 'uniquify',
        saveAs: false
      }, () => {
        window.setTimeout(resolve, 3000);
      });
    });
  }
};

const cache = {};

browser.tabs.onRemoved.addListener(tabId => delete cache[tabId]);
exports.saveContent = (request,senderTab) =>{
  console.log(request);
  if (downloads[senderTab]) {
    downloads[senderTab].terminate();
  }
  downloads[senderTab] = new Download();
  downloads[senderTab].init(request, senderTab);
}


