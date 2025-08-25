const cds = require('@sap/cds');
const oApiUtil = require("./helper/apiUtil");
const SapCfMailer = require("sap-cf-mailer").default;
const JobSchedulerClient = require("@sap/jobs-client");


class CAPBPAReminder extends cds.ApplicationService {
    async init() {
        this.on('sendMail', async () => {

            try {

                const transporter = new SapCfMailer("GmailSMTP"); // Match your destination
                const html = this.getHTMLBody();
                const result = await transporter.sendMail({

                    to: "gsurwade@deloitte.com", //to list separated by comma

                    cc: "", //cc list separated by comma

                    subject: "Test Mail from BTP System",

                    html: html,

                    attachments: []

                });

                return `Email sent successfully`;

            } catch (error) {

                console.error('Error sending email:', error);

                return `Error sending email: ${error.message}`;

            }

        });

        this.on("triggerReminderEmailJob", async (req) => {
            const { res } = req.http;

            res.statusCode = 202;

            return {
                message: "Request Accepted. Job is in progress"
            };

        });

        this.after("triggerReminderEmailJob", async (data, req) => {
            cds.spawn(async (params) => {
                try {
                    const aTaskEmailSend = [];
                    const aDefinitionIds = req.data.definitionIdList;
                    for (const oWFId of aDefinitionIds) {
                        if (oWFId) {
                            //get all task from bpa
                            const sURL = `/public/workflow/rest/v1/task-instances?workflowDefinitionId=${oWFId}&status=READY&$expand=attributes`;
                            const aTaskList = await oApiUtil.readDataFromBPA(sURL);
                            for (const oTask of aTaskList.data) {
                                if (oTask.attributes.length >= 2) {
                                    const cnt = oTask.attributes.filter((oItem) => oItem.id === "count");
                                    const unit = oTask.attributes.filter((oItem) => oItem.id === "unit");

                                    //calculting time lapsed for task
                                    // const givenDate = new Date("2025-08-24T11:09:59.797Z");
                                    const givenDate = new Date(oTask.createdAt);
                                    const now = new Date();
                                    let diffMs = now - givenDate;
                                    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                    diffMs -= days * (1000 * 60 * 60 * 24);
                                    const hours = Math.floor(diffMs / (1000 * 60 * 60));
                                    diffMs -= hours * (1000 * 60 * 60);
                                    const minutes = Math.floor(diffMs / (1000 * 60));
                                    console.log(`${days} days, ${hours} hours, ${minutes} minutes have passed.`);
                                    if (unit[0].value === "HOURS") {
                                        if (hours % cnt[0].value === 0 && hours >= cnt[0].value) {
                                            let dueDate = "";
                                            if (oTask.dueDate) {
                                                let dDueDate = new Date(dueDate);

                                                // Example: "August 27, 2025, 12:17 PM"
                                                const options = {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                    hour12: true
                                                };

                                                dueDate = dDueDate.toLocaleString('en-US', options);
                                            }
                                            let To = oTask.recipientUsers.join(",");
                                            let Subject = oTask.subject
                                            //send email

                                            await this.sendReminderEmail(To, Subject, "Gaurav", dueDate);
                                            aTaskEmailSend.push(oTask.id)
                                        }
                                    } else if (unit[0].value === "DAYS") {

                                    }

                                }
                            }

                        }
                    }

                    this.updateJobRunLog(true, req, aTaskEmailSend);

                } catch (error) {
                    this.updateJobRunLog(false, req, aTaskEmailSend,);
                }
            });
        })


        this.sendReminderEmail = async (To, Subject, Name, DueDate) => {
            try {

                const transporter = new SapCfMailer("GmailSMTP"); // Match your destination
                let htmlBody = this.getHTMLBody();
                htmlBody = htmlBody.replace("#[Name]", Name)
                htmlBody = htmlBody.replace("#[Due Date]", DueDate ? DueDate : "No Due Date")
                const result = await transporter.sendMail({

                    to: To, //to list separated by comma

                    cc: "", //cc list separated by comma

                    subject: Subject,

                    html: htmlBody,

                    attachments: []

                });

                return `Email sent successfully`;

            } catch (error) {

                console.error('Error sending email:', error);

                return `Error sending email: ${error.message}`;

            }
        }
        this.getHTMLBody = () => {
            const emailBody =
                `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Task Approval Reminder</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f8f9fa; }
    .container { max-width: 600px; margin: 40px auto; background: #fff; padding: 24px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);}
    .button { display: inline-block; padding: 10px 20px; background: #0070c0; color: #fff; text-decoration: none; border-radius: 4px; }
    .footer { margin-top: 24px; font-size: 12px; color: #888; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Reminder: Task Approval Needed</h2>
    <p>Dear #[Name],</p>
    <p>This is a friendly reminder that your approval is required for the following task:</p>
    <ul>
      <li><strong>Task Name:</strong> Demo Approval Task</li>
      <li><strong>Due Date:</strong> #[Due Date]</li>
    </ul>
    <p>Please review and approve the task at your earliest convenience.</p>
    <p>
      <a href="[Approval Link]" class="button">Approve Task</a>
    </p>
    <p>If you have any questions or need additional information, please let us know.</p>
    <div class="footer">
      Thank you,<br>
      Build Process Automation
    </div>
  </div>
</body>
</html>
`;
            return emailBody;
        }


        this.updateJobRunLog = async (bStatus, req, aTaskList) => {
            // Access the incoming request headers
            const headers = req.headers;
            let oPayload = {};

            if (headers["x-sap-job-id"] && headers["x-sap-job-run-id"] && headers["x-sap-job-schedule-id"]) {
                // oPayload = {
                //     jobId: headers["x-sap-job-id"],
                //     scheduleId: headers["x-sap-job-schedule-id"],
                //     runId: headers["x-sap-job-run-id"],
                //     data: {
                //         "success": bStatus,
                //         "message": bStatus ? "Success" : "Error"
                //     }
                // }
                oPayload = {
                    "success": bStatus,
                    "message": bStatus ? "Success" : "Error"
                }
                
                const URL = `https://jobscheduler-rest.cfapps.us10.hana.ondemand.com/scheduler/jobs/${headers["x-sap-job-id"]}/schedules/${headers["x-sap-job-schedule-id"]}/runs/${headers["x-sap-job-run-id"]}`;

                const oResponse = await oApiUtil.updateJobSchedulerRunLog(URL,oPayload);
                console.log(oResponse);
            }
        }


        this.updateJobRunLogs = async (req) => new Promise(async (resolve, reject) => {

            try {
                const scheduler = new JobSchedulerClient.Scheduler();
                scheduler.updateJobRunLog(req, (err, result) => {
                    if (err) {
                        err.flag = "E";
                        resolve(JSON.stringify(err));
                    } else {
                        result.flag = "S";
                        resolve(JSON.stringify(result));
                    }
                });
            } catch (oErr) {
                resolve(JSON.stringify(oErr.message));
            }
        });

    }
}
module.exports = { CAPBPAReminder };