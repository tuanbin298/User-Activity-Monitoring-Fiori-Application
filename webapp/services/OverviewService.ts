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
  ): Promise<number> {
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
      const uniqueUsers = new Set(aData.map((item) => item.Username));

      return uniqueUsers.size;
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
  ): Promise<number> {
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

      return oBinding.getLength();
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
  ): Promise<number> {
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

      return oBinding.getLength();
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
