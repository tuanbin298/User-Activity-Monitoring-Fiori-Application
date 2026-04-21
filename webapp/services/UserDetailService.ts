import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import Filter from "sap/ui/model/Filter";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";

export default class UserDetailService {
  // ===========================================
  // Call user_detail entity
  // Data for User Detail page
  // ===========================================
  static async getAuthDetailData(
    oModel: ODataModel,
    aFilters: Filter[],
  ): Promise<any> {
    try {
      const oBinding = oModel.bindList(
        "/user_detail",
        undefined,
        undefined,
        aFilters,
      ) as ODataListBinding;

      const aContexts = await oBinding.requestContexts(0, 1);

      return aContexts;
    } catch (error) {
      throw new Error("Failed to load user detail data");
    }
  }
}
