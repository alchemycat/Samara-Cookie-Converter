const fs = require('fs');
const path = require('path');
const convertNetscapeToJson = require('./converter.js');

//Константы
const group = 'TESTA';
const url1 = 'https://www.google.com/';
const url2 = 'https://pay.google.com/\\nhttps://ads.google.com/';

const dirs = getDirectories(path.resolve('logs'));

let spendxList = dirs.filter((name) => name.includes('Spend X'));
let santaList = dirs.filter((name) => name.includes('1_of_1'));
let paranoidList = dirs.filter((name) => name.includes('Paranoid'));

let result = [];
let files = [];

function init(list, type) {
  list.forEach((dir, i) => {
    files = [];

    ThroughDirectory(dir);

    if (files.length > 0) {
      createSamaraFile(files, i, type);
    }
  });
}

init(spendxList, 'Spend X');
init(santaList, 'Santa');
init(paranoidList, 'Paranoid');

function findTargetFile(files, type) {
  let allFiles = files;

  let targetFile;

  if (type === 'Spend X') {
    files = files.filter((file) =>
      file.includes('GoogleFastCheck\\Cookies_JSON.txt')
    );

    if (files.length > 0) {
      targetFile = files[0];
    } else {
      targetFile = null;
    }
  } else if (type === 'Santa') {
    files = files.filter((file) => {
      if (
        file.includes('Santa_cookies\\Cookies_Google_NetScape.txt') ||
        file.includes('Santa_cookies\\Full_Cookies_json')
      ) {
        return file;
      }
    });

    let fileIndex = files.findIndex((file) =>
      file.includes('Full_Cookies_json')
    );

    if (files.length > 0) {
      if (fileIndex != -1) {
        //если вдруг нашли json файлик
        targetFile = files[fileIndex];
      } else {
        //netscape
        targetFile = files[0];
      }
    } else {
      targetFile = null;
    }
  } else {
    files = files.filter((file) => {
      return file.includes('Gpay_Good_Cookies_Netscape');
    });
    if (files.length > 0) {
      targetFile = files[0];
    } else {
      targetFile = null;
    }
  }

  let fileData = {};

  if (targetFile) {
    if (type === 'Spend X') {
      fileData.countryCode = targetFile
        .match(/_\w{2}_\d+\.\d+\.\d+\.\d+/)[0]
        .match(/(?<=_)\w{2}?(?=_)/)[0];
    } else if (type === 'Santa') {
      // fileData.countryCode = targetFile.match(
      //   /(?<=\(1_of_1\)_)\w{2}?(?=\[)/
      // )[0];
      fileData.countryCode = targetFile.match(/(?<=_)[A-Z]{2}(?=(_|\[))/)[0];
    } else {
      fileData.countryCode = targetFile.match(/(?<=Gpay_)\w{2}(?=_)/)[0];
    }

    fileData.content = fs.readFileSync(targetFile, { encoding: 'utf-8' });
  }

  if (!fileData.content) {
    //Поиск наибольшего файла
    fileData.content = findLargestFile(allFiles);
  }

  if (/\t/.test(fileData.content)) {
    fileData.content = convertNetscapeToJson(fileData.content);
  }

  return fileData;
}

function createSamaraFile(files, index, type) {
  files = files.filter((file) => {
    if (file.includes('.txt') && /(Chrome|Cookie)/.test(file)) {
      return file;
    }
  });

  const fileData = findTargetFile(files, type);

  result.push(
    `${fileData.countryCode}-00${index + 1}\t${group}\t${url1}\t${url2}\t${
      fileData.content
    }`
  );

  result.sort(function (a, b) {
    return a > b ? 1 : a === b ? 0 : -1;
  });

  fs.writeFileSync(path.resolve('result.txt'), result.join('\n'));
}

//Получение всех папок
function getDirectories(srcpath) {
  return fs
    .readdirSync(srcpath)
    .map((file) => path.join(srcpath, file))
    .filter((path) => fs.statSync(path).isDirectory());
}

//функция для получения списка файлов

function ThroughDirectory(Directory) {
  fs.readdirSync(Directory).forEach((file) => {
    const absolute = path.join(Directory, file);
    if (fs.statSync(absolute).isDirectory()) return ThroughDirectory(absolute);
    else return files.push(absolute);
  });
}

//Поиск наибольшего файла
function findLargestFile(files) {
  let sizes = [];
  files.forEach((file) => {
    let stats = fs.statSync(file);
    let fileSizeInBytes = stats.size;
    sizes.push(fileSizeInBytes);
  });
  const maxSize = Math.max(...sizes);
  let fileIndex = sizes.findIndex((size) => size === maxSize);
  return files[fileIndex];
}
