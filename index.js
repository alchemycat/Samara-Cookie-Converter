const fs = require('fs-extra');
const path = require('path');
const convertNetscapeToJson = require('./converter.js');

//Константы
const group = 'TESTA';
const url1 = 'https://www.google.com/';
const url2 = 'https://pay.google.com/\\nhttps://ads.google.com/';

const dirs = getDirectories(path.resolve('logs'));

let spendxList = dirs.filter((name) => name.includes('Spend X'));
let santaList = dirs.filter((name) => /\(\d_of_\d\)/.test(name)); //регулярка так как значения меняются
let paranoidList = dirs.filter((name) => name.includes('Paranoid'));

let result = [];
let files = [];

function init(list, type) {
  list.forEach((dir, i) => {
    files = [];

    ThroughDirectory(dir);

    if (files.length > 0) {
      let isCreated = createSamaraFile(files, i, type);
      if (!isCreated) {
        fs.move(
          dir,
          `${path.resolve('errors')}/${path.basename(dir)}`,
          (err) => {
            if (err) return console.error(err);
            console.log(`Не могу найти код страны: ${dir}`);
          }
        );
      }
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

  let tempStr;

  if (targetFile) {
    tempStr = targetFile.match(/(?<=_)[A-Z]{2}(?=(_|\[))/gm);

    if (Array.isArray(tempStr) && tempStr.length > 0) {
      if (tempStr.length > 1) {
        tempStr = null;
      } else {
        tempStr = tempStr[0];
      }
    }

    fileData.countryCode = tempStr;

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

  if (!fileData.countryCode) {
    return false;
  }

  result.push(
    `${fileData.countryCode}-00${index + 1}\t${group}\t${url1}\t${url2}\t${
      fileData.content
    }`
  );

  result.sort(function (a, b) {
    return a > b ? 1 : a === b ? 0 : -1;
  });

  fs.writeFileSync(path.resolve('result.txt'), result.join('\n'));
  return true;
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
