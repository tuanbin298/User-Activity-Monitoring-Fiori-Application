import Filter from "sap/ui/model/Filter";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import BaseService from "./BaseService";

export default class OverviewService {
  // ===========================================
  // Call searchhelp_username_data entity
  // Data for overview section {total of user}
  // ===========================================
  static async getTotalUsers(
    oModel: ODataModel,
    aFilters: Filter[],
  ): Promise<{
    numberUser: number;
    arrayUser: any[];
  }> {
    try {
      const oBinding = oModel.bindList(
        "/searchhelp_username_data",
        undefined,
        undefined,
        aFilters,
        { $count: true },
      ) as ODataListBinding;

      const aData = await BaseService._fetchAllData(oBinding);

      // Group unique user
      const uniqueUsers = [...new Set(aData.map((item) => item.Username))];

      // Add key
      const aDataUser = uniqueUsers.map((user) => {
        return {
          Username: user,
        };
      });

      return {
        numberUser: uniqueUsers.length,
        arrayUser: aDataUser,
      };
    } catch (error) {
      throw new Error("Failed to load total users");
    }
  }

  // ====================================================
  // Call authenticate_data entity
  // Data for overview section {total of authenticate log}
  // ====================================================
  static async getTotalAuthLogs(
    oModel: ODataModel,
    aFilters: Filter[],
  ): Promise<{
    numberData: number;
    arrayData: any[];
    arrayLogFail: any[];
  }> {
    const oLogFail: Record<string, any> = {};
    const count = 0 as number;

    try {
      const oBinding = oModel.bindList(
        "/authenticate_data",
        undefined,
        undefined,
        aFilters,
        { $count: true },
      ) as ODataListBinding;

      // Executes the OData call
      await oBinding.requestContexts();

      const aData = await BaseService._fetchAllData(oBinding);

      // Group by
      aData.forEach((oContext) => {
        const key = oContext.Username;
        const message = oContext.LoginMessage;

        if (!oLogFail[key]) {
          oLogFail[key] = {
            Messages: new Set<string>(),
            Count: count,
            Users: oContext.Username,
            EventId: oContext.EventId,
          };
        }

        oLogFail[key].Count += 1;

        if (message) {
          oLogFail[key].Messages.add(message);
        }
      });

      //  Convert into array
      let aLogFailData = Object.values(oLogFail).map((item: any) => {
        const messagesArray = Array.from(item.Messages);

        return {
          Username: item.Users,
          Count: item.Count,
          Messages: messagesArray,
          EventId: item.EventId,
        };
      });

      // Sort data
      aLogFailData.sort((a: any, b: any) => b.Count - a.Count);

      // Edit data to tree table
      const aTreeData = aLogFailData.map((user) => ({
        Username: user.Username,
        Count: user.Count,
        children: user.Messages.map((msg) => ({
          Message: msg,
        })),
      }));

      // debugger;
      return {
        numberData: aData.length || 0,
        arrayData: aData,
        arrayLogFail: aTreeData,
      };
    } catch (error) {
      throw new Error("Failed to load total authentication logs");
    }
  }

  // ====================================================
  // Call activity_data entity
  // Data for overview section {total dump log}
  // ====================================================
  static async getTotalDump(
    oModel: ODataModel,
    aFilters: Filter[],
  ): Promise<{
    numberData: number;
    arrayData: any[];
  }> {
    const oDumpData: Record<string, any> = {};
    const count = 0 as number;

    try {
      const oBinding = oModel.bindList(
        "/activity_data",
        undefined,
        undefined,
        aFilters,
        { $count: true },
      ) as ODataListBinding;

      // Executes the OData call
      await oBinding.requestContexts();

      const aData = await BaseService._fetchAllData(oBinding);

      // Group by
      aData.forEach((oContext) => {
        const key = oContext.MessageText;
        const username = oContext.Username;
        const actDate = oContext.ActDate;

        if (!oDumpData[key]) {
          oDumpData[key] = {
            MessageText: oContext.MessageText,
            Count: count,
            Users: new Set<string>(),
            Dates: new Set<string>(),
          };
        }

        oDumpData[key].Count += 1;

        if (username) {
          oDumpData[key].Users.add(username);
        }

        if (actDate) {
          oDumpData[key].Dates.add(actDate);
        }
      });

      //  Convert into array
      let aDumpData = Object.values(oDumpData).map((item: any) => {
        const usersArray = Array.from(item.Users);
        const dates = Array.from(item.Dates);

        return {
          MessageText: item.MessageText,
          Count: item.Count,
          Username: usersArray.join(" - "),
          Dates: dates.join(" | "),
        };
      });

      // Sort data
      aDumpData.sort((a: any, b: any) => b.Count - a.Count);

      return {
        numberData: aData.length || 0,
        arrayData: aDumpData,
      };
    } catch (error) {
      throw new Error("Failed to load total dump logs");
    }
  }

  // ===========================================
  // Call system_data entity
  // Data for overview section {system}
  // ===========================================
  static async getSystemInfo(oModel: ODataModel): Promise<string> {
    try {
      const oBinding = oModel.bindList(
        "/system_data",
        undefined,
        undefined,
        undefined,
        { $count: true },
      ) as ODataListBinding;

      // Executes the OData call
      const aSystemContexts = await oBinding.requestContexts();

      // Add label
      const aDataSystem = aSystemContexts.map((oContext) => {
        const obj = oContext.getObject();
        return {
          ...obj,
          Label: `${obj.userCient} - ${obj.SystemId}`,
        };
      });

      return aDataSystem[0].Label;
    } catch (error) {
      throw new Error("Failed to load system information");
    }
  }
}
