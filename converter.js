module.exports = function convertNetscapeToJson(netscapeCookie) {
  const rows = netscapeCookie.split('\n');
  let result_list = [];

  try {
    for (let row of rows) {
      let e = row.split('\t');

      let temp_dict = {};
      temp_dict.domain = e[0];

      try {
        if (typeof +e[4] == 'number') {
          temp_dict.expirationDate = +e[4];
        } else {
          break;
        }
      } catch {
        console.log('Не удалось конвертировать куку');
        break;
      }

      e[1] == 'TRUE'
        ? (temp_dict.httpOnly = 'TRUE')
        : (temp_dict.httpOnly = 'FALSE');

      try {
        temp_dict.name = e[5];
      } catch {
        temp_dict.name = '';
      }

      temp_dict.path = e[2];

      e[3] == 'TRUE'
        ? (temp_dict.secure = 'True')
        : (temp_dict.secure = 'False');

      try {
        temp_dict.value = e[6].replace('\r', '');
      } catch {
        temp_dict.value = '';
      }
      result_list.push(temp_dict);
    }
  } catch (err) {
    console.log('Возникла непридвиденная ошибка при конвертации');
  }

  //возвращаем результат конвертации
  return JSON.stringify(result_list);
};
