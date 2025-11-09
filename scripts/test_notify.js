const { sendEmail, sendSms } = require('../src/libs/notify');

// Simple CLI: node scripts/test_notify.js --email=test@example.com --phone=+573000000000 --msg="Hola desde test"
const argv = require('minimist')(process.argv.slice(2));
const email = argv.email || argv.e;
const phone = argv.phone || argv.p;
const msg = argv.msg || argv.m || 'Mensaje de prueba desde Ecommerce-Cixi';
const subject = argv.subject || 'Prueba de notificación - Ecommerce-Cixi';

(async () => {
  try {
    if (email) {
      console.log('Intentando enviar email a', email);
      await sendEmail(email, subject, msg, `<p>${msg}</p>`);
    } else {
      console.log('No se indicó email (--email), se omite email.');
    }

    if (phone) {
      console.log('Intentando enviar SMS a', phone);
      await sendSms(phone, msg);
    } else {
      console.log('No se indicó phone (--phone), se omite SMS.');
    }

    console.log('Script finalizado.');
  } catch (e) {
    console.error('Error en script de notificación:', e);
  }
})();
