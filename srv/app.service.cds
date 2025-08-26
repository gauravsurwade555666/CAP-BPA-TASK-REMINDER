
service CAPBPAReminder {
    
    action sendMail()      returns String;

    type Payload {
        definitionIdList : many String;
    }
    // Action to trigger the job for sending Reminder Notification to opent SBPA Approval Task
    action triggerReminderEmailJob (wfIdList: Payload) returns {
        message : String
    };
}
