require("@sap/cds");
const oAxios = require("axios");
const oCfEnv = require("cfenv");
const oLog = cds.log("ApiUtil"); // Add resource ApplicationLogs to service module

const oApiUtil = {

    getAccessTokenBPA: async () => {
        const sClientID = process.env.BPA_CLIENTID;
        const sClientSecret = process.env.BPA_CLIENTSECRET;
        const sTokenURL = process.env.BPA_TOKEN_URL;

        try {
            const oTokenResponse = await oAxios({
                method: "GET",
                url: sTokenURL,
                data: {},
                headers: {
                    "content-type": "application/json"
                },
                auth: {
                    username: sClientID,
                    password: sClientSecret
                }
            });

            if (oTokenResponse) {

                return oTokenResponse.data["access_token"];
            } else {
                oLog.error("getAccessTokenBPA || ERROR: \"oTokenResponse blank\" || CAUSE: \"oTokenResponse blank\"");

                return { ERROR: "oTokenResponse blank", CAUSE: "oTokenResponse blank" };
            }
        } catch (oError) {
            oLog.error(`getAccessTokenBPA || ERROR: ${oError?.message} || CAUSE: ${oError?.cause}`);

            return { ERROR: oError?.message, CAUSE: oError?.cause };
        }
    },
    readDataFromBPA: async (sURL) => {

        try {
            const sBPAEndpoint = process.env.BPA_ENDPOINT_URL;
            const sAccessToken = await oApiUtil.getAccessTokenBPA();
            const sBearertoken = `Bearer ${sAccessToken}`;
            const oHttpheaders = {
                "X-Requested-With": "XMLHttpRequest",
                "Content-Type": "application/json;charset=UTF-8",
                Authorization: sBearertoken
            };

            const EndURL = sBPAEndpoint + sURL;
            const oResponse = await oAxios.get(EndURL, {
                headers: oHttpheaders
            });

            if (oResponse) {

                return oResponse;
            } else {
                oLog.error("readDataFromBPA || ERROR: \"oResponse Empty\" || CAUSE: \"oResponse Empty\"");

                return { ERROR: "Response Empty", CAUSE: "Response Empty" };
            }
        } catch (oError) {
            oLog.error(`readDataFromBPA || ERROR: ${oError?.message} || CAUSE: ${oError?.cause}`);

            return { ERROR: oError?.message, CAUSE: oError?.cause };
        }

    },
   
    updateJobSchedulerRunLog: async (sURL, data) => {
        // const sEndPoint = process.env.JOB_SCHED_END + sURL;
        const sClientID = process.env.JOB_SCHED_ID;
        const sClientSecret = process.env.JOB_SCHED_SECRET;
        const oResponse = await oAxios({
            method: "PUT",
            url: sURL,
            data: data,
            headers: {
                "content-type": "application/json"
            },
            auth: {
                username: sClientID,
                password: sClientSecret
            }
        });
        return oResponse;
    }


};

module.exports = oApiUtil;