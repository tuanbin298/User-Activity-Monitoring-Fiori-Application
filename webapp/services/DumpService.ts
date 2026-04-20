import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import BaseService from "./BaseService";
import Filter from "sap/ui/model/Filter";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";

export default class DumpService {
  // ===========================================
  // Call dump_data entity
  // Data for dump chart
  // ===========================================
  static async getDumpData(
    oModel: ODataModel,
    aFilters: Filter[],
  ): Promise<any[]> {
    const oDumpData = {} as any;

    try {
      const oBinding = oModel.bindList(
        "/dump_data",
        undefined,
        undefined,
        aFilters,
        {
          $count: true,
          $orderby: "DumpCount desc",
        },
      ) as ODataListBinding;

      const aData = await BaseService._fetchAllData(oBinding);
      debugger;
      // Group by + SUM data
      aData.forEach((oContext) => {
        const key = oContext.Username;

        if (!oDumpData[key]) {
          oDumpData[key] = {
            Username: oContext.Username,
            DumpCount: 0,
          };
        }

        oDumpData[key].DumpCount += oContext.DumpCount;
      });

      //  Convert into array
      let aDumpData = Object.values(oDumpData);

      // Sort data
      aDumpData.sort((a: any, b: any) => b.DumpCount - a.DumpCount);

      //  Top 10
      aDumpData = aDumpData.slice(0, 10);

      return aDumpData;
    } catch (error) {
      throw new Error("Failed to load tcode chart");
    }
  }
}
