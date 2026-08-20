require('dotenv').config();
const path = require('path');
const { sendEmailReminder, sendWhatsAppReminder, sendBothReminders } = require(path.join(__dirname, '..', 'services', 'notificationService'));

async function runTests() {
  const testEmail = process.env.TEST_EMAIL || process.env.EMAIL_USER || 'recipient@example.com';
  const testPhone = process.env.TEST_PHONE || process.env.TEST_WHATSAPP || '+1234567890';

  const documentInfo = {
    vehicleNumber: 'TEST-123',
    documentType: 'insurance',
    expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000) // 15 days from now
  };

  console.log('Starting notification tests...');

  console.log(`\n1) Testing Email -> ${testEmail}`);
  try {
    const emailResult = await sendEmailReminder(testEmail, 'Test User', documentInfo, 15);
    console.log('Email result:', emailResult);
  } catch (err) {
    console.error('Email test error:', err);
  }

  console.log(`\n2) Testing WhatsApp -> ${testPhone}`);
  try {
    const whatsappResult = await sendWhatsAppReminder(testPhone, 'Test User', documentInfo, 15);
    console.log('WhatsApp result:', whatsappResult);
  } catch (err) {
    console.error('WhatsApp test error:', err);
  }

  console.log('\n3) Testing Both (sendBothReminders)');
  try {
    const both = await sendBothReminders(testEmail, testPhone, 'Test User', documentInfo, 15);
    console.log('Both result:', both);
  } catch (err) {
    console.error('Both test error:', err);
  }

  console.log('\nNotification tests completed.');
}

runTests().catch(err => {
  console.error('Test script failed:', err);
  process.exit(1);
});
