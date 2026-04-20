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
}
