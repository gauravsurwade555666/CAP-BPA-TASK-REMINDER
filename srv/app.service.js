const cds = require('@sap/cds');

const SapCfMailer = require("sap-cf-mailer").default;

class CAPBPAReminder extends cds.ApplicationService {
    async init() {
        this.on('sendMail', async () => {

            try {

                const transporter = new SapCfMailer("GmailSMTP"); // Match your destination

                const result = await transporter.sendMail({

                    to: "gsurwade@deloitte.com", //to list separated by comma

                    cc: "", //cc list separated by comma

                    subject: "Test Mail from BTP System",

                    html: "Hello from CAP!",

                    attachments: []

                });

                return `Email sent successfully`;

            } catch (error) {

                console.error('Error sending email:', error);

                return `Error sending email: ${error.message}`;

            }

        });
    }
}
module.exports = { CAPBPAReminder };