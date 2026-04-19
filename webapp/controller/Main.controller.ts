import Formatter from "useractivitymonitorapplication/formatter/Formatter";
import BaseController from "./Base.controller";
import AuthService from "useractivitymonitorapplication/services/AuthenticateService";
import Table from "sap/ui/table/Table";

/**
 * @namespace useractivitymonitorapplication.controller.main
 */
export default class Main extends BaseController {
  public formatter = Formatter;

  private _timer: any;

  // =========================
  // Called when the controller is initialized.
  // =========================
  public onInit(): void {
    super.onInit();

    const oGlobalModel = this.getGlobalModel();
    if (oGlobalModel) {
      oGlobalModel.attachPropertyChange(this.onGlobalDateChanged, this);
    }

    this._bindAuthTable();
  }

  // =========================
  // Get data for Authenticate Table
  // =========================
  private _bindAuthTable(): void {
    const oTable = this.byId("MaiTableId") as Table;
    const aFilters = this.getGlobalDateFilter();

    AuthService.bindAuthenticateTable(oTable, aFilters);
  }

  // =========================
  // Change data when global filter daterange changed
  // =========================
  public onGlobalDateChanged(oEvent: any): void {
    if (oEvent.getParameter("path") !== "/toDate") return;

    clearTimeout(this._timer);

    this._timer = setTimeout(() => {
      this.withBusy(async () => {
        this._bindAuthTable();
      });
    }, 200);
  }

  // =========================
  // Validate in global filter daterange
  //   Not allow to filter more than 6 days
  // =========================
  public onGlobalDateRangeChange(oEvent: any): void {
    const oSource = oEvent.getSource();

    const oFrom = oSource.getDateValue();
    const oTo = oSource.getSecondDateValue();

    if (!oFrom || !oTo) return;

    // Calculate date
    const iDiffTime = oTo.getTime() - oFrom.getTime();
    const iDiffDays = iDiffTime / (1000 * 60 * 60 * 24);

    if (iDiffDays > 30) {
      this.showSuccess("Max range is 30 days");

      const oToday = new Date();

      const oFromNew = new Date(oToday);
      oFromNew.setDate(oToday.getDate() - 5);

      const oToNew = oToday;

      oSource.setDateValue(oFromNew);
      oSource.setSecondDateValue(oToNew);
    }
  }

  /**
   * Similar to onAfterRendering, but this hook is invoked before the controller's View is re-rendered
   * (NOT before the first rendering! onInit() is used for that one!).
   * @memberOf useractivitymonitorapplication.ext.main.Main
   */
  // public  onBeforeRendering(): void {
  //
  //  }

  /**
   * Called when the View has been rendered (so its HTML is part of the document). Post-rendering manipulations of the HTML could be done here.
   * This hook is the same one that SAPUI5 controls get after being rendered.
   * @memberOf useractivitymonitorapplication.ext.main.Main
   */
  // public  onAfterRendering(): void {
  //
  //  }

  /**
   * Called when the Controller is destroyed. Use this one to free resources and finalize activities.
   * @memberOf useractivitymonitorapplication.ext.main.Main
   */
  // public onExit(): void {
  //
  //  }
}
