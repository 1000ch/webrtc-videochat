function guid() {
  function s4() {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  }
  var array = [];
  array.push(s4());
  array.push(s4());
  array.push('-');
  array.push(s4());
  array.push('-');
  array.push(s4());
  array.push('-');
  array.push(s4());
  array.push('-');
  array.push(s4());
  array.push(s4());
  array.push(s4());
  return array.join('');
}