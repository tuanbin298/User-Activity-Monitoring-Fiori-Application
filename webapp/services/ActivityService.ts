import Filter from "sap/ui/model/Filter";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import Sorter from "sap/ui/model/Sorter";
import Table from "sap/ui/table/Table";
import BaseService from "./BaseService";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";

export default class ActivityService {
  // ==================================
  // Call activity_data entity
  // Data for activity table
  // ==================================
  static bindActivityTable(oTable: Table, aFilters: Filter[]) {
    oTable.bindRows({
      path: "/activity_data",
      filters: aFilters,
      sorter: [new Sorter("ActDate", true)],
    });
  }

  // ===========================================
  // Call activity_count_perday entity
  // Data for tcode chart
  // ===========================================
  static async getActPerDay(
    oModel: ODataModel,
    aFilters: Filter[],
  ): Promise<any[]> {
    try {
      const oBinding = oModel.bindList(
        "/activity_count_perday",
        undefined,
        undefined,
        aFilters,
        {
          $count: true,
          $orderby: "ActDate asc",
        },
      ) as ODataListBinding;

      const aData = await BaseService._fetchAllData(oBinding);

      return aData;
    } catch (error) {
      throw new Error("Failed to load tcode chart");
    }
  }
}
