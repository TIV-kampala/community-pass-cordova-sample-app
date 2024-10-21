import * as React from "react";
import { useStatePersist, syncStorage } from "use-state-persist";
import ReactJson from "react-json-view";
import { compassHelperClass } from "./utils/compass-helper.ts";
import "./App.css";
import {
  RELIANT_APP_GUID,
  CREDENTIAL_PROGRAM_GUID,
  ACCEPTOR_PROGRAM_GUID,
  PACKAGE_NAME,
} from "./env.ts";
import { Buffer } from "buffer";

const compassHelper = new compassHelperClass(PACKAGE_NAME, RELIANT_APP_GUID);

const Home = () => {
  const [state, setState] = useStatePersist("@globalState", {
    instanceId: "",
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [rId, setRid] = useStatePersist("@rId", "");
  const [consentId, setConsentId] = useStatePersist("@consentId", "");
  const [authToken, setAuthToken] = useStatePersist("@authToken", "");
  const [consumerDeviceId, setConsumerDeviceId] = useStatePersist(
    "@consumerDeviceId",
    ""
  );
  const [programSpaceSchema, setProgramSpaceSchema] = useStatePersist(
    "@programSpaceSchema",
    ""
  );
  const [action, setAction] = useStatePersist("@action", "getInsatnceId");

  const actions = [
    {
      label: "Get Instance ID - CM",
      value: "getInsatnceIdCM",
      execute: async () => {
        setIsLoading(true);
        compassHelper
          .getInstanceId(CREDENTIAL_PROGRAM_GUID)
          .then((res) => {
            setState({
              ...state,
              cmGetInstanceIdResponse: res,
              instanceId: res?.instanceId,
              bridgeRAEncPublicKey: res?.bridgeRAEncPublicKey,
            });
          })
          .catch((err) => {
            setState({ ...state, cmGetInstanceIdResponse: err });
          })
          .finally(() => setIsLoading(false));
      },
    },
    {
      label: "Get Instance ID - Acceptor",
      value: "getInsatnceIdAcceptor",
      execute: async () => {
        setIsLoading(true);
        compassHelper
          .getInstanceId(ACCEPTOR_PROGRAM_GUID)
          .then((res) => {
            setState({
              ...state,
              accGetInstanceIdResponse: res,
              instanceId: res?.instanceId,
            });
          })
          .catch((err) => {
            setState({ ...state, accGetInstanceIdResponse: err });
          })
          .finally(() => setIsLoading(false));
      },
    },
  ];

  React.useEffect(() => {
    try {
      syncStorage.init();
    } catch (e) {
      console.log(e);
    }

    setState({
      ...state,
      instanceId: window.localStorage.getItem("instanceId"),
    });
    setState({ ...state, rId: window.localStorage.getItem("rId") });
    setState({
      ...state,
      bridgeRAEncPublicKey: window.localStorage.getItem("bridgeRAEncPublicKey"),
    });
  }, []);

  React.useEffect(() => {
    if (state.readRegistrationDataResponse?.payload?.data?.rId) {
      setRid(state.readRegistrationDataResponse?.payload?.data?.rId);
    }
  }, [state.readRegistrationDataResponse]);

  React.useEffect(() => {
    if (state.bridgeRAEncPublicKey) {
      actions.push(
        {
          label: "Biometrics consent - CM",
          value: "saveBiometricsConsent",
          execute: async () => {
            setIsLoading(true);
            compassHelper
              .saveBiometricsConsent({
                bridgeRAEncPublicKey: state.bridgeRAEncPublicKey,
                granted: 1,
                programGuid: CREDENTIAL_PROGRAM_GUID,
                reliantAppGuid: RELIANT_APP_GUID,
              })
              .then((res) => {
                setState({
                  ...state,
                  saveBiometricsResponse: res,
                  consentId: res?.payload?.data?.consentId,
                });
                if (res?.payload?.data?.consentId) {
                  setConsentId(res?.payload?.data?.consentId);
                }
              })
              .catch((err) => {
                setState({ ...state, saveBiometricsResponse: err });
              })
              .finally(() => setIsLoading(false));
          },
        },
        {
          label: "Read Registration Data - CM",
          value: "readRegistrationDataCM",
          execute: async () => {
            setIsLoading(true);
            compassHelper
              .readRegistrationData(CREDENTIAL_PROGRAM_GUID)
              .then((res) => {
                setState({
                  ...state,
                  readRegistrationDataCMResponse: res,
                  cmRID: res?.payload?.data?.rId,
                });
              })
              .catch((err) => {
                setState({ ...state, readRegistrationDataCMResponse: err });
              })
              .finally(() => setIsLoading(false));
          },
        },
        {
          label: "Read Registration Data - Acceptor",
          value: "readRegistrationDataAcceptor",
          execute: async () => {
            setIsLoading(true);
            compassHelper
              .readRegistrationData(ACCEPTOR_PROGRAM_GUID)
              .then((res) => {
                setState({
                  ...state,
                  readRegistrationDataAcceptorResponse: res,
                  accRID: res?.payload?.data?.rId,
                });
              })
              .catch((err) => {
                setState({ ...state, readRegistrationDataCMResponse: err });
              })
              .finally(() => setIsLoading(false));
          },
        },
        {
          label: "Create Basic D-ID",
          value: "createBasicDigitalId",
          execute: async () => {
            setIsLoading(true);
            const createBasicDigitalIdResponse = await compassHelper
              .createBasicDigitalId(CREDENTIAL_PROGRAM_GUID)
              .finally(() => setIsLoading(false));
            setState({
              ...state,
              createBasicDigitalIdResponse: createBasicDigitalIdResponse,
              rId: createBasicDigitalIdResponse?.payload?.data?.rId,
            });
            const rID = createBasicDigitalIdResponse?.payload?.data?.rId;
            if (rID) {
              window.localStorage.setItem(
                "rId",
                createBasicDigitalIdResponse?.payload?.data?.rId ?? ""
              );
              setRid(createBasicDigitalIdResponse?.payload?.data?.rId ?? "");
            }
          },
        },
        {
          label: "Create Biometric D-ID",
          value: "createBiometricDigitalId",
          execute: async () => {
            setIsLoading(true);
            await compassHelper
              .createBiometricDigitalId({
                consentId: consentId,
                encrypt: true,
                forcedModalityFlag: true,
                operationMode: "FULL",
                programGuid: CREDENTIAL_PROGRAM_GUID,
                reliantAppGuid: RELIANT_APP_GUID,
              })
              .then((res) => {
                setState({ ...state, createBiometricDigitalIdResponse: res });
              })
              .catch((err) => {
                setState({ ...state, createBiometricDigitalIdResponse: err });
              })
              .finally(() => setIsLoading(false));
          },
        },
        {
          label: "Identify Biometric D-ID",
          value: "IdentifyBiometricDigitalId",
          execute: async () => {
            setIsLoading(true);
            await compassHelper
              .IdentifyBiometricDigitalId({
                consentId: consentId,
                forcedModalityFlag: true,
                cacheHashesIfIdentified: true,
                modality: ["FACE", "LEFT_PALM", "RIGHT_PALM"],
                programGuid: CREDENTIAL_PROGRAM_GUID,
              })
              .then((res) => {
                setState({ ...state, IdentifyBiometricDigitalIdResponse: res });
              })
              .catch((err) => {
                setState({ ...state, IdentifyBiometricDigitalIdResponse: err });
              })
              .finally(() => setIsLoading(false));
          },
        },
        {
          label: "Write  D-ID",
          value: "writeDigitalId",
          execute: async () => {
            setIsLoading(true);
            const writeDigitalIdResponse = await compassHelper
              .writeDigitalIdonCard(CREDENTIAL_PROGRAM_GUID, rId)
              .finally(() => setIsLoading(false));
            setState({
              ...state,
              writeDigitalIdResponse: writeDigitalIdResponse,
            });
            const consumerDeviceNumber =
              writeDigitalIdResponse?.payload?.data?.consumerDeviceNumber;
            if (consumerDeviceNumber) {
              window.localStorage.setItem(
                "consumerDeviceNumber",
                writeDigitalIdResponse?.payload?.data?.consumerDeviceNumber ?? ""
              );
              setConsumerDeviceId(
                writeDigitalIdResponse?.payload?.data?.consumerDeviceNumber ?? ""
              );
            }
          },
        },
        {
          label: "Write Passcode",
          value: "writePasscode",
          execute: async () => {
            setIsLoading(true);
            const writePasscodeResponse = await compassHelper
              .writePasscode(CREDENTIAL_PROGRAM_GUID, rId, "123456")
              .finally(() => setIsLoading(false));
            setState({
              ...state,
              writePasscodeResponse: writePasscodeResponse,
            });
          },
        },
        {
          label: "Add Biometrics to CP User Profile",
          value: "addBiometricsToCpUserProfile",
          execute: async () => {
            setIsLoading(true);
            compassHelper
              .addBiometricsToCpUserProfile({
                consentId: consentId,
                formFactor: "CARD",
                programGuid: CREDENTIAL_PROGRAM_GUID,
                rId: rId,
              })
              .then((res) => {
                setState({ ...state, addBiometricsToCpUserProfileResponse: res });
              })
              .catch((err) => {
                setState({ ...state, addBiometricsToCpUserProfileResponse: err });
              })
              .finally(() => setIsLoading(false));
          },
        },
        {
          label: "Verify Passcode - CM",
          value: "verifyPasscodeCredentialManager",
          execute: async () => {
            setIsLoading(true);
            const verifyPasscode = await compassHelper
              .verifyPasscode(CREDENTIAL_PROGRAM_GUID, "CARD", "123456")
              .finally(() => setIsLoading(false));
            if (verifyPasscode?.payload?.data?.authToken) {
              setAuthToken(verifyPasscode?.payload?.data?.authToken);
            }
  
            setState({
              ...state,
              verifyPasscode: verifyPasscode,
              authToken: verifyPasscode?.payload?.data?.authToken,
            });
          },
        },
        {
          label: "Verify Passcode - Acceptor",
          value: "verifyPasscodeAcceptor",
          execute: async () => {
            setIsLoading(true);
            const verifyPasscode = await compassHelper
              .verifyPasscode(ACCEPTOR_PROGRAM_GUID, "CARD", "123456")
              .finally(() => setIsLoading(false));
            if (verifyPasscode?.payload?.data?.authToken) {
              setAuthToken(verifyPasscode?.payload?.data?.authToken);
            }
  
            setState({
              ...state,
              verifyPasscode: verifyPasscode,
              authToken: verifyPasscode?.payload?.data?.authToken,
            });
          },
        },
        {
          label: "Enroll new user in Acceptor Program",
          value: "EnrollUserToProgram",
          execute: async () => {
            setIsLoading(true);
            await compassHelper
              .enrollNewUserInProgram({
                authToken: authToken,
                formFactor: "CARD",
                programGuid: ACCEPTOR_PROGRAM_GUID,
              })
              .then((res) => {
                setState({ ...state, enrollProgramResponse: res });
              })
              .catch((err) => {
                setState({ ...state, enrollProgramResponse: err });
              })
              .finally(() => setIsLoading(false));
          },
        },
        {
          label: "Read Consumer Device Number",
          value: "getConsumerDeviceNumber",
          execute: async () => {
            setIsLoading(true);
            await compassHelper
              .getConsumerDeviceNumber(CREDENTIAL_PROGRAM_GUID)
              .then((res) => {
                setState({ ...state, getConsumerDeviceNumberResponse: res });
              })
              .catch((err) => {
                setState({ ...state, getConsumerDeviceNumberResponse: err });
              })
              .finally(() => setIsLoading(false));
          },
        },
        {
          label: "Get Data Schema",
          value: "getDataSchema",
          execute: async () => {
            setIsLoading(true);
            await compassHelper
              .getDataSchema(ACCEPTOR_PROGRAM_GUID)
              .then((res) => {
                setState({
                  ...state,
                  getDataSchemaResponse: res,
                  programSpaceSchema: res?.payload?.data?.schemaJson,
                });
                setProgramSpaceSchema(res?.payload?.data?.schemaJson ?? "");
              })
              .catch((err) => {
                setState({ ...state, getDataSchemaResponse: err });
              })
              .finally(() => setIsLoading(false));
          },
        },
  
        {
          label: "Prepare Program Space - Acceptor",
          value: "prepareProgramSpace",
          execute: async () => {
            setIsLoading(true);
            console.log("programSpaceSchema", programSpaceSchema);
            await compassHelper
              .prepareProgramSpace({
                schema: programSpaceSchema,
                programGuid: ACCEPTOR_PROGRAM_GUID,
                programSpaceData: JSON.stringify({
                  id: 1000000001,
                  name: "Eric Kalujja",
                  voucherBalance: 0,
                }),
              })
              .then((res) => {
                setState({ ...state, prepareProgramSpaceResponse: res });
              })
              .catch((err) => {
                setState({ ...state, prepareProgramSpaceResponse: err });
              })
              .finally(() => setIsLoading(false));
          },
        },
        {
          label: "Write To Program Space - Acceptor",
          value: "writeToProgramSpace",
          execute: async () => {
            setIsLoading(true);
            console.log(
              state?.prepareProgramSpaceResponse?.payload?.data?.output
            );
            await compassHelper
              .writeToProgramSpace({
                data: state?.prepareProgramSpaceResponse?.payload?.data?.output,
                programGuid: ACCEPTOR_PROGRAM_GUID,
                rId: state?.accRID,
              })
              .then((res) => {
                setState({ ...state, writeToProgramSpaceResponse: res });
              })
              .catch((err) => {
                setState({ ...state, writeToProgramSpaceResponse: err });
              })
              .finally(() => setIsLoading(false));
          },
        },
        {
          label: "Write Data Record to Card",
          value: "writeDataRecordToCard",
          execute: async () => {
            setIsLoading(true);
            await compassHelper
              .writeDataRecordToCard({
                appDataRecord: [
                  {
                    index: 0,
                    chunk: Buffer.from("Test Data").toString("base64"),
                  },
                  {
                    index: 1,
                    chunk: Buffer.from("Test Data 2").toString("base64"),
                  },
                ],
                programGuid: ACCEPTOR_PROGRAM_GUID,
                reliantAppGuid: RELIANT_APP_GUID,
                rId: state?.accRID,
              })
              .then((res) => {
                setState({ ...state, writeDataRecordToCardResponse: res });
              })
              .catch((err) => {
                setState({ ...state, writeDataRecordToCardResponse: err });
              })
              .finally(() => setIsLoading(false));
          },
        },
        {
          label: "Read Data Record from Card",
          value: "readDataRecordFromCard",
          execute: async () => {
            setIsLoading(true);
            await compassHelper
              .readDataRecordFromCard({
                indexes: [0, 1],
                programGuid: ACCEPTOR_PROGRAM_GUID,
                reliantAppGuid: RELIANT_APP_GUID,
                rId: state?.accRID,
              })
              .then((res) => {
                setState({ ...state, readDataRecordFromCardResponse: res });
              })
              .catch((err) => {
                setState({ ...state, readDataRecordFromCardResponse: err });
              })
              .finally(() => setIsLoading(false));
          },
        },
        {
          label: "Write Data Blob to Card",
          value: "writeDataBlobToCard",
          execute: async () => {
            setIsLoading(true);
            await compassHelper
              .writeDataBlobToCard({
                isShared: true,
                appDataBlock: Buffer.from("Test Data Blob").toString("base64"),
                programGuid: ACCEPTOR_PROGRAM_GUID,
                reliantAppGuid: RELIANT_APP_GUID,
                rId: state?.accRID,
              })
              .then((res) => {
                setState({ ...state, writeDataBlobToCardResponse: res });
              })
              .catch((err) => {
                setState({ ...state, writeDataBlobToCardResponse: err });
              })
              .finally(() => setIsLoading(false));
          },
        },
        {
          label: "Read Data Blob from Card",
          value: "readDataBlobFromCard",
          execute: async () => {
            setIsLoading(true);
            await compassHelper
              .readDataBlobFromCard({
                isShared: true,
                programGuid: ACCEPTOR_PROGRAM_GUID,
                reliantAppGuid: RELIANT_APP_GUID,
                rId: state?.accRID,
              })
              .then((res) => {
                setState({ ...state, readDataBlobFromCardResponse: res });
              })
              .catch((err) => {
                setState({ ...state, readDataBlobFromCardResponse: err });
              })
              .finally(() => setIsLoading(false));
          },
        },
        {
          label: "Create SVA",
          value: "createSva",
          execute: async () => {
            setIsLoading(true);
            await compassHelper
              .createSva({
                isProgramSpace: false,
                programGuid: ACCEPTOR_PROGRAM_GUID,
                reliantAppGuid: RELIANT_APP_GUID,
                rId: state?.accRID,
                svaData: {
                  purseSubType: "POINT",
                  svaUnit: "bl",
                },
              })
              .then((res) => {
                setState({ ...state, createSvaResponse: res });
              })
              .catch((err) => {
                setState({ ...state, createSvaResponse: err });
              })
              .finally(() => setIsLoading(false));
          },
        },
  
        {
          label: "Read SVA",
          value: "readSva",
          execute: async () => {
            setIsLoading(true);
            await compassHelper
              .readSva({
                isProgramSpace: false,
                programGuid: ACCEPTOR_PROGRAM_GUID,
                reliantAppGuid: RELIANT_APP_GUID,
                rId: state?.accRID,
                svaUnit: "bl",
              })
              .then((res) => {
                setState({ ...state, readSvaResponse: res });
              })
              .catch((err) => {
                setState({ ...state, readSvaResponse: err });
              })
              .finally(() => setIsLoading(false));
          },
        },
        {
          label: "Read All SVAs",
          value: "readAllSvas",
          execute: async () => {
            setIsLoading(true);
            await compassHelper
              .readAllSvas({
                isProgramSpace: false,
                programGuid: ACCEPTOR_PROGRAM_GUID,
                reliantAppGuid: RELIANT_APP_GUID,
                rId: state?.accRID,
              })
              .then((res) => {
                setState({ ...state, readAllSvasResponse: res });
              })
              .catch((err) => {
                setState({ ...state, readAllSvasResponse: err });
              })
              .finally(() => setIsLoading(false));
          },
        },
        {
          label: "INCREASE SVA",
          value: "mutateSva",
          execute: async () => {
            setIsLoading(true);
            await compassHelper
              .mutateSva({
                isProgramSpace: false,
                programGuid: ACCEPTOR_PROGRAM_GUID,
                reliantAppGuid: RELIANT_APP_GUID,
                rId: state?.accRID,
                svaOperation: {
                  amount: 100,
                  operationType: "INCREASE",
                  svaUnit: "bl",
                },
              })
              .then((res) => {
                setState({ ...state, mutateSvaResponse: res });
              })
              .catch((err) => {
                setState({ ...state, mutateSvaResponse: err });
              })
              .finally(() => setIsLoading(false));
          },
        },
  
        {
          label: "Verify Biometrics",
          value: "verifyBiometricDigitalId",
          execute: async () => {
            setIsLoading(true);
            await compassHelper
              .verifyBiometricDigitalId({
                forcedModalityFlag: true,
                formFactor: "CARD",
                programGuid: ACCEPTOR_PROGRAM_GUID,
                reliantAppGuid: RELIANT_APP_GUID,
              })
              .then((res) => {
                setState({ ...state, verifyBiometricDigitalIdResponse: res });
              })
              .catch((err) => {
                setState({ ...state, verifyBiometricDigitalIdResponse: err });
              })
              .finally(() => setIsLoading(false));
          },
        },
        {
          label: "Batch Operation - CM",
          value: "batchOperation",
          execute: async () => {
            setIsLoading(true);
            await compassHelper
              .batchOperation({
                shouldContinueOnError: false,
                reliantAppInstanceId:
                  window.localStorage.getItem("instanceId") ?? "",
                programGuid: CREDENTIAL_PROGRAM_GUID,
                operations: [
                  {
                    actions: "1038",
                    payload: {
                      passcode: "123456",
                      formFactor: "CARD",
                      participationProgramId: CREDENTIAL_PROGRAM_GUID,
                    },
                  },
                  {
                    actions: "1033",
                    payload: {
                      rId: state?.accRID,
                      isProgramSpace: false,
                      participationProgramId: CREDENTIAL_PROGRAM_GUID,
                    },
                  },
                ],
              })
              .then((res) => {
                setState({ ...state, batchOperationResponse: res });
              })
              .catch((err) => {
                setState({ ...state, batchOperationResponse: err });
              })
              .finally(() => setIsLoading(false));
          },
        },
        {
          label: "Start Data Sync",
          value: "startDataSync",
          execute: async () => {
            setIsLoading(true);
            await compassHelper
              .startDataSync({
                programGuid: CREDENTIAL_PROGRAM_GUID,
              })
              .then((res) => {
                setState({ ...state, startDataSyncResponse: res });
              })
              .catch((err) => {
                setState({ ...state, startDataSyncResponse: err });
              })
              .finally(() => setIsLoading(false));
          },
        },
        {
          label: "Get Data Sync Worker Status",
          value: "getDataSyncWorkerStatus",
          execute: async () => {
            setIsLoading(true);
            await compassHelper
              .getDataSyncWorkerStatus({
                programGuid: CREDENTIAL_PROGRAM_GUID,
              })
              .then((res) => {
                setState({ ...state, getDataSyncWorkerStatusResponse: res });
              })
              .catch((err) => {
                setState({ ...state, getDataSyncWorkerStatusResponse: err });
              })
              .finally(() => setIsLoading(false));
          },
        },
        {
          label: "Clear App State",
          value: "clearAppState",
          execute: async () => {
            setIsLoading(true);
            setState({});
            setRid("");
            setConsumerDeviceId("");
            setProgramSpaceSchema("");
            setAuthToken("");
            setIsLoading(false);
          },
        }
      );
    }
  }, [state.bridgeRAEncPublicKey]);

  const SelectActionToExecute = ({ value, data, setAction }) => {
    const [isFocus, setIsFocus] = React.useState(false);

    return (
      <div className="py-4">
        <select
          className={`bg-white h-[50px] border rounded-lg px-2 w-full 
            ${isFocus ? "border-orange-600" : "border-gray-200"}`}
          value={value}
          onChange={(e) => {
            setIsFocus(false);
            setAction(e.target.value);
          }}
          onFocus={() => setIsFocus(true)}
          onBlur={() => setIsFocus(false)}
        >
          <option value="">Select action</option>
          {data.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const executeAction = async () => {
    if (action) {
      await actions.find((item) => item.value === action)?.execute();
    }
  };

  if (isLoading) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center flex-1 w-full h-full px-4 py-4 bg-white">
        <div className="w-8 h-8 border-t-4 border-orange-600 rounded-full animate-spin"></div>
        <p className="flex items-center justify-center py-4 text-xs">
          Executing {action} ...
        </p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col w-full h-full max-h-full p-4 bg-slate-200">
      <div className="flex flex-row justify-center w-full px-4 py-2 bg-white">
        <h1 className="flex justify-center text-lg font-bold text-black">
          React Bridge RA
        </h1>
      </div>

      <div className="flex flex-row items-center justify-between w-full py-4 space-x-4">
        <div className="flex-1">
          <SelectActionToExecute
            value={action}
            data={actions}
            setAction={setAction}
          />
        </div>

        <div className="flex-3">
          <button
            disabled={!action}
            className={`rounded-md h-[50px] flex justify-center items-center px-4 
              ${!action ? "bg-gray-300" : "bg-orange-600"} text-white`}
            onClick={executeAction}
          >
            <span className="mr-2">▶</span>
            Execute
          </button>
        </div>
      </div>

      <div className="flex flex-col w-full max-w-full px-4 pb-4 overflow-scroll bg-white h-fit">
        <div className="py-2">
          <h2 className="text-lg font-medium">Result:</h2>
        </div>
        <div className="flex flex-wrap w-full py-4 overflow-x-auto rounded">
          <ReactJson src={state} />
        </div>
      </div>
    </div>
  );
};

export default Home;
