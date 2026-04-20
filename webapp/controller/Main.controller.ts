import Formatter from "useractivitymonitorapplication/formatter/Formatter";
import BaseController from "./Base.controller";
import AuthService from "useractivitymonitorapplication/services/AuthenticateService";
import Table from "sap/ui/table/Table";
import JSONModel from "sap/ui/model/json/JSONModel";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import OverviewService from "useractivitymonitorapplication/services/OverviewService";
import Dialog from "sap/m/Dialog";
import Fragment from "sap/ui/core/Fragment";
import SearchHelpService from "useractivitymonitorapplication/services/SearchHelpService";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import Input from "sap/m/Input";
import Select from "sap/m/Select";
import DatePicker from "sap/m/DatePicker";
import DateFormat from "sap/ui/core/format/DateFormat";

/**
 * @namespace useractivitymonitorapplication.controller.main
 */
export default class Main extends BaseController {
  public formatter = Formatter;

  private _timer: any;
  private _oUserSearchHelpDialog: Dialog | null = null;
  private _aUserDateFilters: Filter[] = [];

  // ===========================================
  // Called when the controller is initialized.
  // ===========================================
  public onInit(): void {
    super.onInit();

    const oOverviewModel = new JSONModel({
      totalUsers: 0,
      totalLogs: 0,
      successLogin: 0,
      failedLogin: 0,
      lockedUsers: 0,
      dumpCount: 0,
      systemInformation: "",
    });
    this.getView()?.setModel(oOverviewModel, "OverviewData");

    const oGlobalModel = this.getGlobalModel();
    if (oGlobalModel) {
      oGlobalModel.attachPropertyChange(this.onGlobalDateChanged, this);
    }

    this._bindAuthTable();
    this._loadOverviewData();
    this.applyFilters();
  }

  // ==================================
  // Get data for Authenticate Table
  // ==================================
  private _bindAuthTable(): void {
    const oTable = this.byId("MaiTableId") as Table;
    const aFilters = this._buildFilters();

    AuthService.bindAuthenticateTable(oTable, aFilters);
  }

  // ===========================================
  // Called when the View has been rendered
  // ===========================================
  public onAfterRendering(): void {
    // Set range in date picker
    const oDatePicker = this.byId("mainDatePickerId") as DatePicker;

    if (!oDatePicker) return;

    const { from, to } = this.getGlobalDateRange();

    oDatePicker.setMinDate(new Date(from));
    oDatePicker.setMaxDate(new Date(to));
  }

  // ====================================================
  // Change data when global filter daterange changed
  // ====================================================
  public onGlobalDateChanged(oEvent: any): void {
    if (oEvent.getParameter("path") !== "/toDate") return;

    clearTimeout(this._timer);

    this._timer = setTimeout(() => {
      this.withBusy(async () => {
        this._bindAuthTable();
        await this._loadOverviewData();
      });
    }, 200);
  }

  // ===========================================
  // Validate in global filter daterange
  // Not allow to filter more than 6 days
  // ===========================================
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

  // ===========================================
  // Load data for overview section
  // ===========================================
  public async _loadOverviewData(): Promise<void> {
    const oModel = this.getAppComponent().getModel() as ODataModel;
    const oOverviewModel = this.getView()?.getModel(
      "OverviewData",
    ) as JSONModel;
    // Get global filter date
    const aFilters = this.getGlobalDateFilter();

    try {
      const [totalUsers, totalLogs] = await Promise.all([
        // Call fn getTotalUsers
        OverviewService.getTotalUsers(oModel, aFilters),

        // Call fn getTotalAuthLogs
        OverviewService.getTotalAuthLogs(oModel, aFilters),
      ]);

      // Set property
      oOverviewModel.setProperty("/totalUsers", totalUsers);
      oOverviewModel.setProperty("/totalLogs", totalLogs);
    } catch (error: any) {
      this.showError(error.message || "Failed to load overview data");

      oOverviewModel.setProperty("/totalUsers", 0);
      oOverviewModel.setProperty("/totalLogs", 0);
    }
  }

  // ===========================================
  // Open Search Help
  // ===========================================
  public async onUserSearchHelp(): Promise<void> {
    const oModel = this.getAppComponent().getModel() as ODataModel;
    const aFilters = this.getGlobalDateFilter();

    // Call fn getSHUsernameData
    const aUsers = await SearchHelpService.getSHUsernameData(oModel, aFilters);
    const oUserModel = new JSONModel(aUsers);
    this.getView()?.setModel(oUserModel, "userSeachHelp");

    if (!this._oUserSearchHelpDialog) {
      // Load fragment
      this._oUserSearchHelpDialog = (await Fragment.load({
        id: this.getView()?.getId(),
        name: "useractivitymonitorapplication.fragment.UserSearchHelp",
        controller: this,
      })) as Dialog;

      this.getView()?.addDependent(this._oUserSearchHelpDialog);
    }

    this._oUserSearchHelpDialog.open();
  }

  public onCloseUserDialog(): void {
    this._oUserSearchHelpDialog?.close();
  }

  // ===========================================
  // User Selected Data from Search Help List
  // ===========================================
  public onUserSelect(oEvent: any): void {
    const oItem = oEvent.getParameter("listItem");

    const oContext = oItem.getBindingContext("userSeachHelp");
    const oSelected = oContext?.getObject();

    if (oSelected) {
      (this.byId("userSearchId") as Input).setValue(oSelected);
    }

    this.applyFilters();

    this._oUserSearchHelpDialog?.close();
  }

  // ===========================================
  // User Search Username
  // ===========================================
  public onSearchUserName(): void {
    this.applyFilters();
  }

  // ===========================================
  // User Filter Status
  // ===========================================
  public onFilterStatus(): void {
    this.applyFilters();
  }

  // ===========================================
  // User Filter Date
  // ===========================================
  public onFilterLoginDate(): void {
    this.applyFilters();
  }

  // ===========================================
  // Apply filter to table
  // ===========================================
  public applyFilters(): void {
    const oTable = this.byId("MaiTableId") as Table;
    const oBinding = oTable.getBinding("rows") as any;
    oTable.setBusy(true);

    // Call fn _buildFilters
    const aFilters = this._buildFilters();

    if (oBinding) {
      oBinding.filter(aFilters);
    }

    setTimeout(() => {
      oTable.setBusy(false);
    }, 300);
  }

  // ===========================================
  // Build ALL filters
  // ===========================================
  private _buildFilters(): Filter[] {
    const aFilters: Filter[] = [];

    //  Username search
    const sSearch = (this.byId("userSearchId") as Input).getValue();
    if (sSearch) {
      aFilters.push(new Filter("Username", FilterOperator.Contains, sSearch));
    }

    // Statis filter
    const sStatus = (this.byId("MainDropdown") as Select).getSelectedKey();
    if (sStatus) {
      aFilters.push(new Filter("LoginResult", FilterOperator.EQ, sStatus));
    }

    // Date filter
    this._aUserDateFilters = [];

    const oDatePicker = this.byId("mainDatePickerId") as DatePicker;
    if (oDatePicker) {
      const oDate = oDatePicker.getDateValue();

      if (oDate) {
        const oFormatter = DateFormat.getDateInstance({
          pattern: "yyyy-MM-dd",
        });

        const sDate = oFormatter.format(oDate);

        this._aUserDateFilters = [
          new Filter("LoginDate", FilterOperator.EQ, sDate),
        ];
      }
    }

    // Filter date or Global filter date
    const aDateFilters =
      this._aUserDateFilters.length > 0
        ? this._aUserDateFilters
        : this.getGlobalDateFilter();

    return [...aDateFilters, ...aFilters];
  }
}
