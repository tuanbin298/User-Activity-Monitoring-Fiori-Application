import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import BaseService from "./BaseService";
import Filter from "sap/ui/model/Filter";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";

export default class TCodeService {
  // ===========================================
  // Call tcode_data entity
  // Data for tcode chart
  // ===========================================
  static async getTCodeData(
    oModel: ODataModel,
    aFilters: Filter[],
  ): Promise<any[]> {
    const oTCodeData = {} as any;

    try {
      const oBinding = oModel.bindList(
        "/tcode_data",
        undefined,
        undefined,
        aFilters,
        {
          $count: true,
          $orderby: "TCodeCount desc",
        },
      ) as ODataListBinding;

      const aData = await BaseService._fetchAllData(oBinding);

      // Group by + SUM data
      aData.forEach((oContext) => {
        const key = oContext.Tcode;

        // If TCode is exist, plus TCodeCount, else create new obj
        if (!oTCodeData[key]) {
          oTCodeData[key] = {
            TCode: oContext.Tcode,
            TCodeName: oContext.TCodeName,
            TCodeCount: 0,
          };
        }

        oTCodeData[key].TCodeCount += oContext.TCodeCount;
      });

      //  Convert into array
      let aTCodeData = Object.values(oTCodeData);

      // Sort data
      aTCodeData.sort((a: any, b: any) => b.TCodeCount - a.TCodeCount);

      //  Top 5
      aTCodeData = aTCodeData.slice(0, 5);

      //  Add label
      aTCodeData.forEach((item: any) => {
        item.Label = `${item.TCode} - ${item.TCodeName}`;
      });

      return aTCodeData;
    } catch (error) {
      throw new Error("Failed to load tcode chart");
    }
  }
}
