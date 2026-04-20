import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import BaseService from "./BaseService";
import Filter from "sap/ui/model/Filter";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";

export default class SearchHelpService {
  // ===========================================
  // Call searchhelp_username_data entity
  // ===========================================
  static async getSHUsernameData(
    oModel: ODataModel,
    aFilters: Filter[],
  ): Promise<any> {
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
      const aUser = Array.from(new Set(aData.map((item) => item.Username)));

      return aUser;
    } catch (error) {
      throw new Error("Failed to load search help username data");
    }
  }
}
