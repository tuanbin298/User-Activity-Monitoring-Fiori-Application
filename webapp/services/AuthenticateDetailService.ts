import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import Filter from "sap/ui/model/Filter";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";

export default class AuthenticateDetailService {
  // ===========================================
  // Call authenticate_data entity
  // Data for Auth Detail page
  // ===========================================
  static async getAuthDetailData(
    oModel: ODataModel,
    aFilters: Filter[],
  ): Promise<any[]> {
    try {
      const oBinding = oModel.bindList(
        "/authenticate_data",
        undefined,
        undefined,
        aFilters,
        {
          $expand: "_Activity",
        },
      ) as ODataListBinding;

      const aContexts = await oBinding.requestContexts(0, 1);

      return aContexts;
    } catch (error) {
      throw new Error("Failed to load tcode chart");
    }
  }
}
