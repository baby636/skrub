'use strict';
require('buffer-safe');
const fs = require('fs');
const path = require('path');
const globby = require('globby');
const fileBytes = require('file-bytes');
const objectAssign = require('object-assign');
const pify = require('pify');
const rimrafP = pify(require('rimraf'));
const toType = require('to-type');

const floodFile = (file, iterations) => {
  if (typeof iterations === 'undefined' || iterations < 0) {
    iterations = 1;
  }
  return Promise.all(Array(iterations).fill(
    fileBytes(file)
      .then((size) => {
        return new Promise(resolve => {
          let wstream = fs.createWriteStream(file);
          wstream.write(Buffer.alloc(size));
          wstream.end();
          wstream.on('finish', () => {
            resolve(file);
          });
        });
      }).catch(err => {
        throw err;
      })
  ));
};

module.exports = (pattern, opts) => {
  // validate arguments
  const patternType = toType(pattern);
  if (patternType !== 'string' && patternType !== 'array') {
    throw new TypeError(`Expected a string or array for pattern, got ${typeof pattern}`);
  }
  opts = objectAssign({}, opts);

  return globby(pattern, opts).then(function (files) {
    return Promise.all(files.map(function (file) {
      file = path.resolve(opts.cwd || '', file);

      if (opts.dryRun) {
        return file;
      }
      return floodFile(file, opts.iterations)
        .then(rimrafP(file))
        .then(function () {
          return file;
        });
    }));
  });
};

module.exports.floodFile = floodFile;
