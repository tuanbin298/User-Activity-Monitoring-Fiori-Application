import DateFormat from "sap/ui/core/format/DateFormat";
import { ValueState } from "sap/ui/core/library";

const Formatter = {
  // Format Icon Login Result
  formatLoginResultIcon: function (sValue: string): string {
    if (sValue === "SUCCESS") {
      return "sap-icon://message-success";
    } else {
      return "sap-icon://message-error";
    }
  },

  // Format State Login Result
  formatLoginResultState: function (sValue: string): ValueState {
    if (sValue === "SUCCESS") {
      return ValueState.Success;
    } else {
      return ValueState.Error;
    }
  },

  // Format State Login Message
  formatLoginMessageState: function (sValue: string): ValueState {
    if (sValue === "AU2" || sValue === "BU1" || sValue === "AUM") {
      return ValueState.Error;
    } else {
      return ValueState.Success;
    }
  },

  // Format Icon Login Message
  formatLoginMessageIcon: function (sValue: string): string {
    if (sValue === "AU2" || sValue === "BU1") {
      return "sap-icon://message-error";
    } else if (sValue === "AUM") {
      return "sap-icon://locked";
    } else {
      return "sap-icon://message-success";
    }
  },

  // Format Date
  formatISODate: function (oDate: any): string {
    if (!oDate) {
      return "00-00-0000";
    }

    const dateObj = new Date(oDate);

    // Check dateObj
    if (!isNaN(dateObj.getTime())) {
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, "0");
      const day = String(dateObj.getDate()).padStart(2, "0");

      return `${day}-${month}-${year}`;
    }

    return "00-00-0000";
  },

  // Format Time
  formatLogoutTime: function (oTime: any) {
    if (oTime === "12:00:00 AM") {
      return "00:00:00";
    }

    return oTime;
  },

  // Format Lock
  formatTextLockStatus: function (sValue: string): string {
    return sValue === "0" ? "Active" : "Locked";
  },

  formatTextLockState: function (sValue: string): string {
    return sValue === "0" ? "Success" : "Error";
  },

  formatTextLockIcon: function (sValue: string): string {
    return sValue === "0" ? "sap-icon://accept" : "sap-icon://locked";
  },

  // Format Activity Type
  formatActivityType: function (sAct: string): string {
    if (sAct === "DUMP") {
      return "sap-icon://alert";
    } else {
      return "sap-icon://activity-2";
    }
  },

  // Format Activity State
  formatActivityState: function (sAct: string): string {
    switch (sAct) {
      case "DUMP":
        return "Error";
      case "TCODE":
        return "Success";
      default:
        return "None";
    }
  },

  // Format TCode Icon
  formatTCodeIcon: function (sAct: string): string {
    if (sAct === "") {
      return "";
    } else {
      return "sap-icon://customer-and-contacts";
    }
  },

  // Format date for User detail title
  formatTitleWithDate(title: string, fromDate: Date, toDate: Date): string {
    if (!fromDate || !toDate) {
      return title;
    }

    const oDateFormat = DateFormat.getDateInstance({
      pattern: "dd/MM",
    });

    return `${title} (${oDateFormat.format(fromDate)} - ${oDateFormat.format(toDate)})`;
  },

  // Format text for message
  formatLoginMessageText(sMessage: string): string {
    if (!sMessage) {
      return "Message";
    }

    const sLower = sMessage.toLowerCase();

    if (sLower.includes("success")) {
      return "Message Success";
    }

    if (sLower.includes("failed") || sLower.includes("fail")) {
      return "Message Failed";
    }

    if (sLower.includes("locked")) {
      return "User Locked";
    }

    return "Message";
  },
};

export default Formatter;
