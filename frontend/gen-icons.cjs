
const fs = require('fs');
const si = require('simple-icons');
const ver = JSON.parse(fs.readFileSync('node_modules/simple-icons/package.json', 'utf8')).version;

const WANT = [
  ['whatsapp',  'siWhatsapp',  'LBL_WA'],
  ['telegram',  'siTelegram',  'LBL_TG'],
  ['facebook',  'siFacebook',  'LBL_FB'],
  ['instagram', 'siInstagram', 'LBL_IG'],
  ['x',         'siX',         'LBL_X'],
  ['tiktok',    'siTiktok',    'LBL_TT'],
  ['youtube',   'siYoutube',   'LBL_YT'],
  ['snapchat',  'siSnapchat',  'LBL_SC'],
];

const rows = WANT.map(([key, slug, label]) => {
  const i = si[slug];
  if (!i) throw new Error('missing ' + slug);
  return '  { key: ' + JSON.stringify(key) + ', label: "' + label + '", hex: '
    + JSON.stringify('#' + i.hex) + ',\n    path: ' + JSON.stringify(i.path) + ' },';
}).join('\n');

fs.writeFileSync('.icons.gen.txt', 'VERSION=' + ver + '\n' + rows, 'utf8');
console.log('ok v' + ver);
