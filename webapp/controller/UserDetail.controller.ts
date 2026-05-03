import Formatter from "useractivitymonitorapplication/formatter/Formatter";
import BaseController from "./Base.controller";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import UserDetailService from "useractivitymonitorapplication/services/UserDetailService";
import JSONModel from "sap/ui/model/json/JSONModel";
import AuthService from "useractivitymonitorapplication/services/AuthenticateService";
import Table from "sap/ui/table/Table";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import LoginResultService from "useractivitymonitorapplication/services/LoginResultService";
import ActivityService from "useractivitymonitorapplication/services/ActivityService";
import TCodeService from "useractivitymonitorapplication/services/TCodeService";
import Select from "sap/m/Select";
import DatePicker from "sap/m/DatePicker";
import DateFormat from "sap/ui/core/format/DateFormat";
import SearchHelpService from "useractivitymonitorapplication/services/SearchHelpService";
import Dialog from "sap/m/Dialog";
import Fragment from "sap/ui/core/Fragment";
import Input from "sap/m/Input";
import Spreadsheet from "sap/ui/export/Spreadsheet";
import MessageBox from "sap/m/MessageBox";
import BaseService from "useractivitymonitorapplication/services/BaseService";
import OverviewService from "useractivitymonitorapplication/services/OverviewService";

export default class UserDetail extends BaseController {
  public formatter = Formatter;

  private _sUsername: string = "";

  private _aAuthDateFilters: Filter[] = [];
  private _aActDateFilters: Filter[] = [];

  private _oTCodeSearchHelpDialog: Dialog | null = null;
  private _oAuthViewSettingsDialog: Dialog | null = null;
  private _oActViewSettingsDialog: Dialog | null = null;

  // ===========================================
  // Called when the controller is initialized.
  // ===========================================
  public onInit(): void {
    super.onInit();

    const oRouter = (this as any).getAppComponent().getRouter();
    if (oRouter) {
      oRouter
        .getRoute("UserDetail")
        .attachPatternMatched(this._onObjectMatched, this);
    }
  }

  // =================================================
  // Handles route matching for AuthDetail page
  // and loads detail data based on the navigation key.
  // =================================================
  private async _onObjectMatched(oEvent: any): Promise<void> {
    const sUsername = oEvent.getParameter("arguments").username;
    this._sUsername = sUsername;

    const oView = this.getView();
    if (!oView || !sUsername) return;

    oView.setBusy(true);

    try {
      await this._loadAllData(sUsername);
    } catch (error: any) {
      this.showError(error.message || "Failed to load data");
    } finally {
      oView.setBusy(false);
    }
  }

  // ===========================================
  // Called when the View has been rendered
  // ===========================================
  public onAfterRendering(): void {
    // Set range in date picker
    const oDatePicker = this.byId("AuthDatePickerId") as DatePicker;
    const oActDatePicker = this.byId("ActivityDatePickerId") as DatePicker;

    if (!oDatePicker) return;

    const { from, to } = this.getGlobalDateRange();

    oDatePicker.setMinDate(new Date(from));
    oDatePicker.setMaxDate(new Date(to));

    oActDatePicker.setMinDate(new Date(from));
    oActDatePicker.setMaxDate(new Date(to));
  }

  // =================================================
  // Call Odata - Load data
  // =================================================
  private async _loadAllData(username: string): Promise<void> {
    await Promise.all([
      this._loadUserDetail(username),
      this._loadAuthTable(username),
      this._loadAuthChart(username),
      this._loadActivityTable(username),
      this._loadActivityChart(username),
    ]);

    await this.applyAuthFilters();
    await this.applyActFilters();
  }

  // =================================================
  // Get data of user detail
  // =================================================
  private async _loadUserDetail(username: string): Promise<void> {
    const oModel = this.getAppComponent().getModel() as ODataModel;
    const aFilters = [new Filter("Username", FilterOperator.EQ, username)];

    const oView = this.getView();
    if (!oView || !username) return;

    try {
      const [userDetailData] = await Promise.all([
        UserDetailService.getAuthDetailData(oModel, aFilters),
      ]);

      // Call fn getAuthDetailData
      const oDetailModel = new JSONModel(userDetailData[0]?.getObject());
      oView.setModel(oDetailModel, "UserDetailData");
    } catch (error: any) {
      this.showError(error.message || "Failed to user detail data");
    }
  }

  // =================================================
  // Get data for Authenticate Table
  // =================================================
  private async _loadAuthTable(username: string): Promise<void> {
    const oTable = this.byId("AuthTableId") as Table;
    const oModel = this.getAppComponent().getModel() as ODataModel;

    // Filter globlal date
    const aGlobalFilters = this.getGlobalDateFilter();
    const aFilters = [new Filter("Username", FilterOperator.EQ, username)];

    const userAuthLogFilters = [...aGlobalFilters, ...aFilters];

    AuthService.bindAuthenticateTable(oTable, aFilters);

    // Number
    const aDataNumber = await OverviewService.getTotalAuthLogs(
      oModel,
      userAuthLogFilters,
    );

    const oView = this.getView();
    oView?.setModel(
      new JSONModel({
        totalLogs: aDataNumber.numberData,
      }),
      "AuthLogSummary",
    );
  }

  // ===========================================
  // Apply filter to auth table
  // ===========================================
  public async applyAuthFilters(): Promise<void> {
    const oTable = this.byId("AuthTableId") as Table;
    const oBinding = oTable.getBinding("rows") as ODataListBinding;

    oTable.setBusy(true);

    try {
      const aFilters = this._buildAuthTableFilters();

      if (oBinding) {
        oBinding.filter(aFilters);

        await oBinding.requestContexts();
      }
    } catch (error) {
      this.showError("Failed to filter auth data");
    } finally {
      oTable.setBusy(false);
    }
  }

  private _buildAuthTableFilters(): Filter[] {
    const aFilters: Filter[] = [];

    //  Global date
    this.getGlobalDateFilter();

    // Username
    if (this._sUsername) {
      aFilters.push(new Filter("Username", FilterOperator.EQ, this._sUsername));
    }

    // Filter Status
    const sStatus = (
      this.byId("AuthStatusSelectId") as Select
    ).getSelectedKey();
    if (sStatus) {
      aFilters.push(new Filter("LoginResult", FilterOperator.EQ, sStatus));
    }

    // Date filter
    this._aAuthDateFilters = [];
    const oDatePicker = this.byId("AuthDatePickerId") as DatePicker;
    if (oDatePicker) {
      const oDate = oDatePicker.getDateValue();

      if (oDate) {
        const oFormatter = DateFormat.getDateInstance({
          pattern: "yyyy-MM-dd",
        });

        const sDate = oFormatter.format(oDate);

        this._aAuthDateFilters = [
          new Filter("LoginDate", FilterOperator.EQ, sDate),
        ];
      }
    }

    // Filter date or Global filter date
    const aDateFilters =
      this._aAuthDateFilters.length > 0
        ? this._aAuthDateFilters
        : this.getGlobalDateFilter();

    return [...aDateFilters, ...aFilters];
  }

  // =================================================
  // Get data for Login result chart
  // =================================================
  private async _loadAuthChart(username: string): Promise<void> {
    const oModel = this.getAppComponent().getModel() as ODataModel;

    const oView = this.getView();
    if (!oView || !username) return;

    // Filter
    const aFilters = [
      new Filter("Username", FilterOperator.EQ, username),
      ...this.getGlobalDateFilter(),
    ];

    try {
      const [loginResultData, loginPerDays] = await Promise.all([
        // Call fn getLoginResult
        LoginResultService.getLoginResult(oModel, aFilters),

        // Call fn getLoginResult
        LoginResultService.getLoginPerDay(oModel, aFilters),
      ]);

      const oLoginResultModel = new JSONModel(loginResultData.chartData);
      const oLoginPerDaystModel = new JSONModel(loginPerDays);

      oView.setModel(oLoginResultModel, "LoginResultData");
      oView.setModel(oLoginPerDaystModel, "LoginPerDaysData");
    } catch (error: any) {
      this.showError(error.message || "Failed to load auth data for chart");
    }
  }

  // =================================================
  // Get data for Activity Table
  // =================================================
  private _loadActivityTable(username: string): void {
    const oTable = this.byId("ActivityTableId") as Table;
    const aFilters = [new Filter("Username", FilterOperator.EQ, username)];

    ActivityService.bindActivityTable(oTable, aFilters);
  }

  // ===========================================
  // Apply filter to act table
  // ===========================================
  public async applyActFilters(): Promise<void> {
    const oTable = this.byId("ActivityTableId") as Table;
    const oBinding = oTable.getBinding("rows") as ODataListBinding;

    oTable.setBusy(true);

    try {
      const aFilters = this._buildActTableFilters();

      if (oBinding) {
        oBinding.filter(aFilters);

        await oBinding.requestContexts();
      }
    } catch (error) {
      // this.showError("Failed to act auth data");
    } finally {
      oTable.setBusy(false);
    }
  }

  private _buildActTableFilters(): Filter[] {
    const aFilters: Filter[] = [];

    // Global date
    const { from, to } = this.getGlobalDateRange();
    const aGlobalDateFilter = [
      new Filter({
        path: "ActDate",
        operator: FilterOperator.BT,
        value1: from,
        value2: to,
      }),
    ];

    // Username
    if (this._sUsername) {
      aFilters.push(new Filter("Username", FilterOperator.EQ, this._sUsername));
    }

    // Filter Act Type
    const sStatus = (
      this.byId("ActivityTypeSelectId") as Select
    ).getSelectedKey();
    if (sStatus) {
      aFilters.push(new Filter("ActType", FilterOperator.EQ, sStatus));
    }

    // TCode
    const sTcode = (this.byId("ActivityTCodeInputId") as Input).getValue();
    if (sTcode) {
      aFilters.push(new Filter("Tcode", FilterOperator.EQ, sTcode));
    }

    // Date filter
    this._aActDateFilters = [];
    const oDatePicker = this.byId("ActivityDatePickerId") as DatePicker;
    if (oDatePicker) {
      const oDate = oDatePicker.getDateValue();

      if (oDate) {
        const oFormatter = DateFormat.getDateInstance({
          pattern: "yyyy-MM-dd",
        });

        const sDate = oFormatter.format(oDate);

        this._aActDateFilters = [
          new Filter("ActDate", FilterOperator.EQ, sDate),
        ];
      }
    }

    // Filter date or Global filter date
    const aDateFilters =
      this._aActDateFilters.length > 0
        ? this._aActDateFilters
        : aGlobalDateFilter;

    return [...aDateFilters, ...aFilters];
  }

  // =================================================
  // Get data for Activity chart
  // =================================================
  private async _loadActivityChart(username: string): Promise<void> {
    const oModel = this.getAppComponent().getModel() as ODataModel;

    const oView = this.getView();
    if (!oView || !username) return;

    // Global date
    const { from, to } = this.getGlobalDateRange();
    const aGlobalDateFilter = [
      new Filter({
        path: "ActDate",
        operator: FilterOperator.BT,
        value1: from,
        value2: to,
      }),
      new Filter("Username", FilterOperator.EQ, this._sUsername),
    ];

    try {
      const [tcodeData, actPerDay] = await Promise.all([
        // Call fn getTCodeData
        TCodeService.getTCodeData(oModel, aGlobalDateFilter),

        // Call fn getLoginResult
        ActivityService.getActPerDay(oModel, aGlobalDateFilter),
      ]);

      const oLoginResultModel = new JSONModel(tcodeData);
      const oActPerDaystModel = new JSONModel(actPerDay);

      oView.setModel(oLoginResultModel, "TCodeData");
      oView.setModel(oActPerDaystModel, "ActPerDayData");
    } catch (error: any) {
      this.showError(error.message || "Failed to load activity data for chart");
    }
  }

  // ===========================================
  // User Filter Date
  // ===========================================
  public onFilterAuthLoginDate(): void {
    this.applyAuthFilters();
  }

  // ===========================================
  // User Search Username
  // ===========================================
  public onFilterAuth(): void {
    this.applyAuthFilters();
  }

  // ===========================================
  // User Filter Activity Type
  // ===========================================
  public onFilterActivity(): void {
    this.applyActFilters();
  }

  // ===========================================
  // User Search TCode
  // ===========================================
  public onSearchTCode(): void {
    this.applyActFilters();
  }

  // ===========================================
  // Open TCode Search Help
  // ===========================================
  public async onUserSearchHelpTCode(): Promise<void> {
    await this.withBusy(async () => {
      const oModel = this.getAppComponent().getModel() as ODataModel;
      // Global date
      const { from, to } = this.getGlobalDateRange();
      const aGlobalDateFilter = [
        new Filter({
          path: "ActDate",
          operator: FilterOperator.BT,
          value1: from,
          value2: to,
        }),
        new Filter("Username", FilterOperator.EQ, this._sUsername),
      ];

      // Call fn getSHTCodeData
      const aTCode = await SearchHelpService.getSHTCodeData(
        oModel,
        aGlobalDateFilter,
      );

      const oTCodeModel = new JSONModel(aTCode);
      this.getView()?.setModel(oTCodeModel, "TCodeSeachHelp");

      if (!this._oTCodeSearchHelpDialog) {
        // Load fragment
        this._oTCodeSearchHelpDialog = (await Fragment.load({
          id: this.getView()?.getId(),
          name: "useractivitymonitorapplication.fragment.TCodeSearchHelp",
          controller: this,
        })) as Dialog;

        this.getView()?.addDependent(this._oTCodeSearchHelpDialog);
      }

      this._oTCodeSearchHelpDialog.open();
    });
  }

  public onCloseTCodeDialog(): void {
    this._oTCodeSearchHelpDialog?.close();
  }

  // =================================================
  // User Selected Data from TCode Search Help List
  // =================================================
  public onTCodeSelect(oEvent: any): void {
    const oItem = oEvent.getParameter("listItem");
    const oContext = oItem.getBindingContext("TCodeSeachHelp");
    const oSelected = oContext?.getObject();

    if (oSelected) {
      (this.byId("ActivityTCodeInputId") as any).setValue(oSelected.Tcode);

      this.applyActFilters();
    }

    this.onCloseTCodeDialog();
  }

  // ===========================================
  // Export auth data
  // ===========================================
  public onExportAuthExcel(): void {
    const { from, to } = this.getGlobalDateRange();

    const sFileName = `UserAuthenticationLogs_of_${this._sUsername}_${from}_to_${to}.xlsx`;

    MessageBox.confirm("Do you want to export this data to Excel?", {
      title: "Confirm Export",
      actions: ["YES", "NO"],
      emphasizedAction: "YES",

      onClose: async (oAction: string | null) => {
        if (oAction === "YES") {
          // Get table and its OData list binding
          const oTable = this.byId("AuthTableId");
          const oBinding = oTable?.getBinding("rows") as ODataListBinding;

          // Fetch all data as plain array to avoid CSRF token issue with POST $batch
          const aData = await BaseService._fetchAllData(oBinding);

          // Format in Excel
          const aCols = [
            { label: "User Session", property: "SessionId", width: 25 },
            { label: "User Name", property: "Username", width: 15 },
            { label: "Login Result", property: "LoginResult", width: 10 },
            { label: "Login Date", property: "LoginDate", width: 15 },
            { label: "Login Time", property: "LoginTime", width: 15 },
            { label: "Login Message", property: "LoginMessage", width: 150 },
            { label: "Logout Date", property: "LogoutDate", width: 15 },
            { label: "Logout Time", property: "LogoutTime", width: 15 },
            { label: "Event ID", property: "EventId", width: 10 },
            { label: "System ID", property: "SystemId", width: 10 },
            { label: "Terminal ID", property: "TerminalId", width: 15 },
          ];

          // Spreadsheet config
          const oSettings = {
            workbook: { columns: aCols },
            dataSource: aData,
            fileName: sFileName,
            worker: false,
          };

          // Create Excel file and download it
          const oSheet = new Spreadsheet(oSettings);
          oSheet
            .build()
            .then(() => {
              this.showSuccess("Export successful!");
            })
            .catch(() => {
              this.showError("Export failed.");
            })
            .finally(() => {
              oSheet.destroy();
            });
        }
      },
    });
  }

  // ===========================================
  // Open fragment auth view setting
  // ===========================================
  public async onOpenAuthSettings(): Promise<void> {
    if (!this._oAuthViewSettingsDialog) {
      // Load fragment
      this._oAuthViewSettingsDialog = (await Fragment.load({
        id: this.getView()?.getId(),
        name: "useractivitymonitorapplication.fragment.AuthTableViewSetting",
        controller: this,
      })) as Dialog;

      // Add Fragment into view
      this.getView()?.addDependent(this._oAuthViewSettingsDialog);

      this.initializeAuthColumnModel();
    }

    // Open
    this._oAuthViewSettingsDialog.open();
  }

  // ===========================================
  // Init auth view
  // ===========================================
  public initializeAuthColumnModel(): void {
    // Get table and its colums
    const oTable = this.byId("AuthTableId") as any;
    const aColumns = oTable.getColumns();

    // Remove Navigator column
    const aFilteredColumns = aColumns.filter(
      (oColumn: any) => !oColumn.getId().includes("AuthNavigateColumnId"),
    );

    // Create new array contain every column object
    const aColumnData = aFilteredColumns.map((oColumn: any) => {
      const oLabel = oColumn.getLabel();

      return {
        id: oColumn.getId(),
        label: oLabel ? oLabel.getText() : oColumn.getId(),
        visible: oColumn.getVisible(),
      };
    });

    // Create JSONModel, property columns
    const oModel = new JSONModel({
      columns: aColumnData,
    });

    this.getView()?.setModel(oModel, "columnsModel");
  }

  // ===========================================
  // Confirm view of auth table
  // ===========================================
  public onConfirmViewSettings(): void {
    // Get table and its colums
    const oTable = this.byId("AuthTableId") as any;
    const aColumns = oTable.getColumns();

    // Get model and property
    const oModel = this.getView()?.getModel("columnsModel") as JSONModel;
    const aData = oModel.getProperty("/columns");

    // Set visible for column
    aColumns.forEach((oColumn: any) => {
      const oMatch = aData.find((column: any) => column.id === oColumn.getId());

      if (oMatch) {
        oColumn.setVisible(oMatch.visible);
      }
    });

    this._oAuthViewSettingsDialog?.close();
  }

  public onCancelViewSettings(): void {
    this._oAuthViewSettingsDialog?.close();
  }

  // ===========================================
  // Navigate to AuthDetail
  // ===========================================
  public onNavigationToAuthDetail(oEvent: any): void {
    // Get control and BindingContext of line
    const oItem = oEvent.getSource();
    const oContext = oItem.getBindingContext();

    if (oContext) {
      const sSessionId = oContext.getProperty("SessionId");

      // Navigate with parameter session_id
      const oRouter = (this as any).getAppComponent().getRouter();
      if (oRouter) {
        oRouter.navTo("AuthDetail", {
          key: sSessionId,
        });
      }
    }
  }

  // ===========================================
  // Export act data
  // ===========================================
  public onExportActivityExcel(): void {
    const { from, to } = this.getGlobalDateRange();

    const sFileName = `ActivityLogs_of_${this._sUsername}_${from}_to_${to}.xlsx`;

    MessageBox.confirm("Do you want to export this data to Excel?", {
      title: "Confirm Export",
      actions: ["YES", "NO"],
      emphasizedAction: "YES",

      onClose: (oAction: string | null) => {
        if (oAction === "YES") {
          const oTable = this.byId("ActivityTableId") as any;

          const oBinding = oTable?.getBinding("rows") as ODataListBinding;

          const aCols = [
            { label: "Activity ID", property: "ActId", width: 20 },
            { label: "User Name", property: "Username", width: 20 },
            { label: "Activity Type", property: "ActType", width: 15 },
            { label: "TCode", property: "Tcode", width: 10 },
            { label: "TCode Name", property: "TCodeName", width: 20 },
            { label: "Message", property: "MessageText", width: 40 },
            { label: "Date", property: "ActDate", width: 15 },
            { label: "Time", property: "ActTims", width: 15 },
          ];

          const oSettings = {
            workbook: { columns: aCols },
            dataSource: oBinding,
            fileName: sFileName,
            worker: false,
          };

          const oSheet = new Spreadsheet(oSettings);

          oSheet
            .build()
            .then(() => {
              this.showSuccess("Export successful!");
            })
            .catch(() => {
              this.showError("Export failed.");
            })
            .finally(() => {
              oSheet.destroy();
            });
        }
      },
    });
  }

  // ===========================================
  // Open fragment view setting
  // ===========================================
  public async onOpenActivitySettings(): Promise<void> {
    if (!this._oActViewSettingsDialog) {
      // Load fragment
      this._oActViewSettingsDialog = (await Fragment.load({
        id: this.getView()?.getId(),
        name: "useractivitymonitorapplication.fragment.ActTableViewSetting",
        controller: this,
      })) as Dialog;

      // Add Fragment into view
      this.getView()?.addDependent(this._oActViewSettingsDialog);

      this.initializeActivityColumnModel();
    }

    // Open
    this._oActViewSettingsDialog.open();
  }

  // ===========================================
  // Init view
  // ===========================================
  public initializeActivityColumnModel(): void {
    // Get table and its colums
    const oTable = this.byId("ActivityTableId") as any;
    const aColumns = oTable.getColumns();

    // Create new array contain every column object
    const aColumnData = aColumns.map((oColumn: any) => {
      const oLabel = oColumn.getLabel();

      return {
        id: oColumn.getId(),
        label: oLabel ? oLabel.getText() : oColumn.getId(),
        visible: oColumn.getVisible(),
      };
    });

    // Create JSONModel, property columns
    const oModel = new JSONModel({
      columns: aColumnData,
    });

    this.getView()?.setModel(oModel, "ActivityColumnsModel");
  }

  // ===========================================
  // Confirm view of activity table
  // ===========================================
  public onActConfirmViewSettings(): void {
    // Get table and its colums
    const oTable = this.byId("ActivityTableId") as any;
    const aColumns = oTable.getColumns();

    // Get model and property
    const oModel = this.getView()?.getModel(
      "ActivityColumnsModel",
    ) as JSONModel;
    const aData = oModel.getProperty("/columns");

    // Set visible for column
    aColumns.forEach((oColumn: any) => {
      const oMatch = aData.find((column: any) => column.id === oColumn.getId());

      if (oMatch) {
        oColumn.setVisible(oMatch.visible);
      }
    });

    this._oActViewSettingsDialog?.close();
  }

  public onActCancelViewSettings(): void {
    this._oActViewSettingsDialog?.close();
  }

  // ===========================================
  // Show message detail
  // ===========================================
  public onShowLoginMessage(oEvent: any): void {
    const oSource = oEvent.getSource();
    const oContext = oSource.getBindingContext();

    if (!oContext) return;

    const sMessage = oContext.getProperty("LoginMessage");
    const sEventId = oContext.getProperty("EventId");

    const sState = this.formatter.formatLoginMessageState(sEventId);

    this.showMessageByState(sMessage, sState, "Login Message");
  }

  public onClearDate(): void {
    const oDatePicker = this.byId("ActivityDatePickerId") as DatePicker;

    if (oDatePicker) {
      oDatePicker.setValue("");
      oDatePicker.setDateValue(null);
    }
  }

  public onClearAuthDate(): void {
    const oDatePicker = this.byId("AuthDatePickerId") as DatePicker;

    if (oDatePicker) {
      oDatePicker.setValue("");
      oDatePicker.setDateValue(null);
    }
  }
}
