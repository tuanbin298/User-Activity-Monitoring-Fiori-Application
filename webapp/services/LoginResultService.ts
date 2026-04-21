import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import BaseService from "./BaseService";
import Filter from "sap/ui/model/Filter";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";

export default class LoginResultService {
  // ===========================================
  // Call login_result_data entity
  // Data for login result chart
  // ===========================================
  static async getLoginResult(
    oModel: ODataModel,
    aFilters: Filter[],
  ): Promise<{
    chartData: any[];
    successLogin: number;
    failedLogin: number;
  }> {
    try {
      const oBinding = oModel.bindList(
        "/login_result_data",
        undefined,
        undefined,
        aFilters,
        { $count: true },
      ) as ODataListBinding;

      const aData = await BaseService._fetchAllData(oBinding);

      // Set data for overview
      const objData = aData.reduce((acc, cur) => {
        acc[cur.LoginResult] = (acc[cur.LoginResult] || 0) + cur.CountLoginLog;

        return acc;
      }, {});

      // Set data for chart
      const chartData = Object.keys(objData).map((key) => ({
        LoginResult: key,
        CountLoginLog: objData[key],
      }));

      return {
        chartData,
        successLogin: objData.SUCCESS || 0,
        failedLogin: objData.FAIL || 0,
      };
    } catch (error) {
      throw new Error("Failed to load login result chart");
    }
  }

  // ===========================================
  // Call login_result_data entity
  // Data for login result line chart
  // ===========================================
  static async getLoginPerDay(
    oModel: ODataModel,
    aFilters: Filter[],
  ): Promise<any[]> {
    try {
      const oLogUserPerDay = {} as any;

      const oBinding = oModel.bindList(
        "/login_result_data",
        undefined,
        undefined,
        aFilters,
        { $count: true, $orderby: "LoginDate asc" },
      ) as ODataListBinding;

      const aData = await BaseService._fetchAllData(oBinding);

      aData.forEach((oContext) => {
        const key = oContext.LoginDate;

        if (!oLogUserPerDay[key]) {
          oLogUserPerDay[key] = {
            LoginDate: oContext.LoginDate,
            CountLoginLog: 0,
          };
        }

        oLogUserPerDay[key].CountLoginLog += oContext.CountLoginLog;
      });

      //  Convert into array
      let aLogUserPerDay = Object.values(oLogUserPerDay);

      return aLogUserPerDay;
    } catch (error) {
      throw new Error("Failed to load login per day chart");
    }
  }
}
