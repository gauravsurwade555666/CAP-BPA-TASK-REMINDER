
service CAPBPAReminder {
    action sendMail()      returns String;

    type Response {
        TaskIdList : many String;
    }

    type Payload {
        definitionIdList : many String;
    }

    action triggerReminderEmailJob (wfIdList: Payload) returns {
        message : String
    };
}
