/*
 * Library for storing and editing data
 *
 */

const fs = require('fs');
const path = require('path');

const lib = {};

lib.baseDir = path.join(__dirname,'/../.data/');

lib.create = (dir, file, data, callback) => {
  fs.open(`${lib.baseDir}${dir}/${file}.json`, 'wx', (err, fileDescriptior) => {
    if(!err && fileDescriptior) {
      const stringData = JSON.stringify(data);
      fs.writeFile(fileDescriptior, stringData, (err) => {
        if (!err) {
          fs.close(fileDescriptior, (err) => {
            if (!err) {
              callback(false);
            } else {
              callback('Error closing new file');
            }
          })
        } else {
          callback('Error writing to new file');
        }
      })
    } else {
      callback('Could not create new file, it may already exist');
    }
  })
};

lib.read = (dir, file, callback) => {
  fs.readFile(`${lib.baseDir}${dir}/${file}.json`, 'utf8', (err, data) => {
    callback(err, data);
  });
};

lib.update = (dir, file, data, callback) => {
  fs.open(`${lib.baseDir}${dir}/${file}.json`, 'r+', (err, fileDescriptior) => {
    if (!err && fileDescriptior) {
      var stringData = JSON.stringify(data);
      fs.ftruncate(fileDescriptior, (err) => {
        if (!err) {
          fs.writeFile(fileDescriptior, stringData, (err) => {
            if (!err) {
              fs.close(fileDescriptior, (err) => {
                if (!err) {
                  callback(false);
                } else {
                  callback('Error closing existing file');
                }
              })
            } else {
              callback('Error writing to existing file');
            }
          })
        } else {
          callback('Error truncating file');
        }
      });
    } else {
      callback('Could not open the file for updating, it may not exist');
    }
  })
};

lib.delete = (dir, file, callback) => {
  fs.unlink(`${lib.baseDir}${dir}/${file}.json`, (err) => {
    if (!err) {
      callback(false);
    } else {
      callback(err, data);
    }
  });
};

module.exports = lib;
