const cds = require('@sap/cds');
const oApiUtil = require("./helper/apiUtil");
const SapCfMailer = require("sap-cf-mailer").default;
const fs = require('fs');
const path = require('path');

class CAPBPAReminder extends cds.ApplicationService {
    async init() {
        this.on('sendMail', async () => {

            try {

                const transporter = new SapCfMailer("GmailSMTP"); // Match your destination
                
                const htmlPath = path.join(__dirname, './emailTemplate/ReminderEmail.html');
                const html = fs.readFileSync(htmlPath, 'utf-8');

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
        //On event handler listens for the "triggerReminderEmailJob" event
        this.on("triggerReminderEmailJob", async (req) => {

            // Set the HTTP status code to 202 (Accepted) to inform the client
            // that the request has been received and will be processed asynchronously.
            // This allows the client to continue without waiting for the background job to finish.
            const { res } = req.http;
            res.statusCode = 202;
            // Return a message indicating that the job is in progress
            return {
                message: "Request Accepted. Job is in progress"
            };

        });

        //After event handler for background job
        this.after("triggerReminderEmailJob", async (data, req) => {
            //asynchronous operation 
            cds.spawn(async (params) => {
                try {
                    const aTaskEmailSend = [];

                    //Fetching all the WF Definition IDs from response body.
                    const aDefinitionIds = req.data.definitionIdList;

                    //Looping over each WF Definition ID
                    for (const oWFId of aDefinitionIds) {
                        if (oWFId) {
                            //Call BPA API to get all the Open Approval Task Details List with Task attributes from the given WF Instance ID  
                            const sURL = `/public/workflow/rest/v1/task-instances?workflowDefinitionId=${oWFId}&status=READY&$expand=attributes`;
                            const aTaskList = await oApiUtil.readDataFromBPA(sURL);

                            //Looping over Task List
                            for (const oTask of aTaskList.data) {

                                //As per the desing, 2 attributes should be present in the Task, so checking the same
                                if (oTask.attributes.length >= 2) {

                                    //fetching the required aatributes
                                    const cnt = oTask.attributes.filter((oItem) => oItem.id === "count");
                                    const unit = oTask.attributes.filter((oItem) => oItem.id === "unit");

                                    //calculting time lapsed in days, hours & minutes for the given task
                                    const givenDate = new Date(oTask.createdAt);
                                    const now = new Date();
                                    let diffMs = now - givenDate;
                                    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                    diffMs -= days * (1000 * 60 * 60 * 24);
                                    const hours = Math.floor(diffMs / (1000 * 60 * 60));
                                    diffMs -= hours * (1000 * 60 * 60);
                                    const minutes = Math.floor(diffMs / (1000 * 60));
                                    console.log(`${days} days, ${hours} hours, ${minutes} minutes have passed.`);

                                    //If Unit is HOUR then compare lapsed time with the time configuration set in the attributes 
                                    if (unit[0].value === "HOURS") {
                                        if (hours % cnt[0].value === 0 && hours >= cnt[0].value) {

                                            //DueDate is optional for task. 
                                            // Checking if Due Date is present then formatting in user understanble format
                                            let dueDate = "";
                                            if (oTask.dueDate) {
                                                let dDueDate = new Date(oTask.dueDate);
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

                                            //fetching recipient users i.e. approvers responsible for the task
                                            //reducing array to comma separated single string
                                            let To = oTask.recipientUsers.join(",");
                                            let Subject = oTask.subject

                                            //calling reusable function to send email
                                            //BTP Trial Account has only one user named "Gaurav"
                                            await this.sendReminderEmail(To, Subject, "Gaurav", dueDate);

                                            //saving the TaskID in array for which email has been sent
                                            aTaskEmailSend.push(oTask.id)
                                        }
                                    } else if (unit[0].value === "DAYS") {
                                        // you can implement the logic for DAYS Unit
                                    }

                                }
                            }

                        }
                    }

                    // Updating the JOB Run Logs in BTP Job Scheduler.
                    this.updateJobRunLog(true, req, aTaskEmailSend);

                } catch (error) {
                    this.updateJobRunLog(false, req, aTaskEmailSend,);
                }
            });
        })

        // Define an asynchronous function to send a reminder email
        this.sendReminderEmail = async (To, Subject, Name, DueDate) => {
            try {
                // Create a transporter object using SapCfMailer with the BTP Destination name "GmailSMTP"
                // This transporter will be used to send emails via the configured SMTP server
                const transporter = new SapCfMailer("GmailSMTP"); 
               
                // Build the path to the HTML email template file
                const htmlPath = path.join(__dirname, './emailTemplate/ReminderEmail.html');
                // Read the HTML template file content as a string
                let htmlBody = fs.readFileSync(htmlPath, 'utf-8');

                // Replace placeholder #[Name] in the template with the actual recipient's name
                htmlBody = htmlBody.replace("#[Name]", Name)
                // Replace placeholder #[Due Date] with the actual due date or "No Due Date" if not provided
                htmlBody = htmlBody.replace("#[Due Date]", DueDate ? DueDate : "No Due Date")

                // Send the email using the transporter object
                const result = await transporter.sendMail({
                    to: To, //to list separated by comma
                    cc: "", //cc list separated by comma
                    subject: Subject,
                    html: htmlBody,
                    attachments: []
                });
                // Return a success message if the email was sent successfully
                return `Email sent successfully`;

            } catch (error) {
                // Log the error to the console for debugging
                console.error('Error sending email:', error);
                // throw an error message with the error details
                throw new Error(`Error sending email: ${error.message}`);
            }
        }

        // Define an asynchronous function to update log in BTP Scheduler Job Run 
        this.updateJobRunLog = async (bStatus, req, aTaskList) => {
            // Fetch headers from the incoming HTTP request object
            const headers = req.headers;
            let oPayload = {};

            // Check if all required SAP Job Scheduler headers are present in the request
            if (headers["x-sap-job-id"] && headers["x-sap-job-run-id"] && headers["x-sap-job-schedule-id"]) {
                // Prepare the payload to update the job run log with status and message
                oPayload = {
                    "success": bStatus,
                    "message": bStatus ? "Success" : "Error"
                }

                // Construct the URL for updating the job run log in SAP BTP Job Scheduler
                // It's a good practice to externalize such URLs using environment variables
                const URL = `${process.env.JOB_ENDPOINT}/scheduler/jobs/${headers["x-sap-job-id"]}/schedules/${headers["x-sap-job-schedule-id"]}/runs/${headers["x-sap-job-run-id"]}`;

                // Call a reusable utility function to send the update request to the Job Scheduler
                // This function likely performs an HTTP PATCH or POST to update the log
                const oResponse = await oApiUtil.updateJobSchedulerRunLog(URL, oPayload);

                // Log the response from the Job Scheduler for debugging or audit purposes
                console.log(oResponse);
            }
            // If required headers are missing, the function does nothing.
        }

    }
}
module.exports = { CAPBPAReminder };