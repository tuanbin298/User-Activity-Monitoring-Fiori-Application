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
import Spreadsheet from "sap/ui/export/Spreadsheet";
import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";
import MessageBox from "sap/m/MessageBox";
import LoginResultService from "useractivitymonitorapplication/services/LoginResultService";
import TCodeService from "useractivitymonitorapplication/services/TCodeService";
import DumpService from "useractivitymonitorapplication/services/DumpService";
import VBox from "sap/m/VBox";

/**
 * @namespace useractivitymonitorapplication.controller.main
 */
export default class Main extends BaseController {
  public formatter = Formatter;

  private _timer: any;
  private _oUserSearchHelpDialog: Dialog | null = null;
  private _oViewSettingsDialog: Dialog | null = null;
  private _oCommomListDialog: Dialog | null = null;
  private _oDumpListDialog: Dialog | null = null;
  private _oLogFailDialog: Dialog | null = null;

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
    this._loadChartData();
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

    // Set btn for card user locked
    const oLockedBox = this.byId("kpiLockedBox") as VBox;
    if (oLockedBox) {
      oLockedBox.attachBrowserEvent("click", this.onShowLockedUsers.bind(this));
    }

    // Set btn for total log
    const oTotalLogBox = this.byId("kpiTotalLogBox") as VBox;
    if (oTotalLogBox) {
      oTotalLogBox.attachBrowserEvent("click", this.onScrollToTable.bind(this));
    }

    // Set btn for card total
    const oUsersBox = this.byId("kpiTotalUsersBox") as VBox;
    if (oUsersBox) {
      oUsersBox.attachBrowserEvent("click", this.onShowTotalUsers.bind(this));
    }

    // Set btn for card dump
    const oDumpsBox = this.byId("kpiDumpBox") as VBox;
    if (oDumpsBox) {
      oDumpsBox.attachBrowserEvent("click", this.onShowTotalDump.bind(this));
    }

    // Set btn for login fail
    const oLogFailBox = this.byId("kpiFailedBox") as VBox;
    if (oLogFailBox) {
      oLogFailBox.attachBrowserEvent("click", this.onShowLogFail.bind(this));
    }
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
        await this._loadChartData();
      });
    }, 200);

    // Reset Min Max Date after filter global
    const oDatePicker = this.byId("mainDatePickerId") as DatePicker;

    if (!oDatePicker) return;

    const { from, to } = this.getGlobalDateRange();

    oDatePicker.setMinDate(new Date(from));
    oDatePicker.setMaxDate(new Date(to));
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

      // Sunday = 0, Monday = 1 ... Saturday = 6
      const iDay = oToday.getDay();

      // Get Monday
      const iDiffToMonday = iDay === 0 ? -6 : 1 - iDay;

      const oFromNew = new Date(oToday);
      oFromNew.setDate(oToday.getDate() + iDiffToMonday);

      // Get Saturday
      const oToNew = new Date(oFromNew);
      oToNew.setDate(oFromNew.getDate() + 5);

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

    const { from, to } = this.getGlobalDateRange();

    // Filter globlal date
    const aFilters = this.getGlobalDateFilter();
    // Filter locked user
    const aLockedFilters = [
      ...aFilters,
      new Filter("EventId", FilterOperator.EQ, "AUM"),
    ];
    // Filter dump count
    const aDumpFilters = [
      new Filter("ActDate", FilterOperator.BT, from, to),
      new Filter("ActType", FilterOperator.EQ, "DUMP"),
    ];

    try {
      await this.withBusy(async () => {
        const [
          totalUsers,
          totalLogs,
          lockedUsers,
          loginResultData,
          totalDumps,
          systemInfo,
        ] = await Promise.all([
          // Call fn getTotalUsers
          OverviewService.getTotalUsers(oModel, aFilters),

          // Call fn getTotalAuthLogs
          OverviewService.getTotalAuthLogs(oModel, aFilters),
          OverviewService.getTotalAuthLogs(oModel, aLockedFilters),

          // Call fn getLoginResult
          LoginResultService.getLoginResult(oModel, aFilters),

          // Call fn getTotalDump
          OverviewService.getTotalDump(oModel, aDumpFilters),

          // Call fn getSystemInfo
          OverviewService.getSystemInfo(oModel),
        ]);

        // Set property
        oOverviewModel.setProperty("/totalUsers", totalUsers);
        oOverviewModel.setProperty("/totalLogs", totalLogs.numberData);
        oOverviewModel.setProperty(
          "/successLogin",
          loginResultData.successLogin,
        );
        oOverviewModel.setProperty("/failedLogin", loginResultData.failedLogin);
        oOverviewModel.setProperty("/lockedUsers", lockedUsers.numberData);
        oOverviewModel.setProperty("/dumpCount", totalDumps.numberData);
        oOverviewModel.setProperty("/systemInformation", systemInfo);
      });
    } catch (error: any) {
      this.showError(error.message || "Failed to load overview data");

      oOverviewModel.setProperty("/totalUsers", 0);
      oOverviewModel.setProperty("/totalLogs", 0);
      oOverviewModel.setProperty("/lockedUsers", 0);
      oOverviewModel.setProperty("/dumpCount", 0);
      oOverviewModel.setProperty("/successLogin", 0);
      oOverviewModel.setProperty("/failedLogin", 0);
    }
  }

  // ===========================================
  // Load data for chart section
  // ===========================================
  public async _loadChartData(): Promise<void> {
    const oModel = this.getAppComponent().getModel() as ODataModel;
    // Filter globlal date
    const aFilters = this.getGlobalDateFilter();

    const { from, to } = this.getGlobalDateRange();
    const tcodeFilter = [new Filter("ActDate", FilterOperator.BT, from, to)];

    try {
      const [loginResultData, tcodeData, dumpData] = await Promise.all([
        // Call fn getLoginResult
        LoginResultService.getLoginResult(oModel, aFilters),

        // Call fn getTCodeData
        TCodeService.getTCodeData(oModel, tcodeFilter),

        // Call fn getDumpData
        DumpService.getDumpData(oModel, tcodeFilter),
      ]);

      const loginResulJsonModel = new JSONModel(loginResultData.chartData);
      const tcodeJsonModel = new JSONModel(tcodeData);
      const dumpJsonModel = new JSONModel(dumpData);

      // Set model
      this.getView()?.setModel(loginResulJsonModel, "loginResultData");
      this.getView()?.setModel(tcodeJsonModel, "tcodeData");
      this.getView()?.setModel(dumpJsonModel, "dumpData");
    } catch (error: any) {
      this.showError(error.message || "Failed to load chart data");
    }
  }

  // ===========================================
  // Open Search Help
  // ===========================================
  public async onUserSearchHelp(): Promise<void> {
    const oModel = this.getAppComponent().getModel() as ODataModel;
    const aFilters = this.getGlobalDateFilter();

    await this.withBusy(async () => {
      // Call fn getSHUsernameData
      const aUsers = await SearchHelpService.getSHUsernameData(
        oModel,
        aFilters,
      );
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
    });
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
  public async applyFilters(): Promise<void> {
    const oTable = this.byId("MaiTableId") as Table;
    const oBinding = oTable.getBinding("rows") as ODataListBinding;

    oTable.setBusy(true);

    try {
      const aFilters = this._buildFilters();

      if (oBinding) {
        oBinding.filter(aFilters);

        await oBinding.requestContexts();
      }
    } catch (error) {
      // this.showError("Failed to filter data");
    } finally {
      oTable.setBusy(false);
    }
  }

  // ===========================================
  // Build ALL filters
  // ===========================================
  private _buildFilters(): Filter[] {
    const aFilters: Filter[] = [];

    // Username search
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

  // ===========================================
  // Open fragment view setting
  // ===========================================
  public async onOpenViewSettings(): Promise<void> {
    await this.withBusy(async () => {
      if (!this._oViewSettingsDialog) {
        // Load fragment
        this._oViewSettingsDialog = (await Fragment.load({
          id: this.getView()?.getId(),
          name: "useractivitymonitorapplication.fragment.AuthTableViewSetting",
          controller: this,
        })) as Dialog;

        // Add Fragment into view
        this.getView()?.addDependent(this._oViewSettingsDialog);

        this.initializeColumnModel();
      }

      // Open
      this._oViewSettingsDialog.open();
    });
  }

  // ===========================================
  // Init view
  // ===========================================
  public initializeColumnModel(): void {
    // Get table and its colums
    const oTable = this.byId("MaiTableId") as any;
    const aColumns = oTable.getColumns();

    // Remove Navigator column
    const aFilteredColumns = aColumns.filter(
      (oColumn: any) => !oColumn.getId().includes("columnNavigator"),
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
    const oTable = this.byId("MaiTableId") as any;
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

    this._oViewSettingsDialog?.close();
  }

  public onCancelViewSettings(): void {
    this._oViewSettingsDialog?.close();
  }

  // ===========================================
  // Export data
  // ===========================================
  public onExportExcel(): void {
    const { from, to } = this.getGlobalDateRange();

    const sFileName = `UserAuthenticationLogs_${from}_to_${to}.xlsx`;

    MessageBox.confirm("Do you want to export this data to Excel?", {
      title: "Confirm Export",
      actions: ["YES", "NO"],
      emphasizedAction: "YES",

      onClose: (oAction: string | null) => {
        if (oAction === "YES") {
          // Get table and its OData list binding
          const oTable = this.byId("MaiTableId");
          const oBinding = oTable?.getBinding("rows") as ODataListBinding;

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
            dataSource: oBinding,
            fileName: sFileName,
            worker: false,
          };

          // Spreadsheet config
          const oSheet = new Spreadsheet(oSettings);

          // Create Excel file and download it
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
  // Navigate to AuthDetail
  // ===========================================
  public onPressNavigate(oEvent: any): void {
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
  // Navigate to UserDetail
  // ===========================================
  public onNavigateUserDetail(oEvent: any): void {
    // Get control and BindingContext of line
    const oItem = oEvent.getSource();
    const oContext = oItem.getBindingContext();

    if (oContext) {
      const sUsername = oContext.getProperty("Username");

      // Navigate with parameter username
      const oRouter = (this as any).getAppComponent().getRouter();
      if (oRouter) {
        oRouter.navTo("UserDetail", {
          username: sUsername,
        });
      }
    }
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

  // ===========================================
  // Show fragment lock user
  // ===========================================
  public async onShowLockedUsers(): Promise<void> {
    await this.withBusy(async () => {
      const oModel = this.getAppComponent().getModel() as ODataModel;
      // Filter globlal date
      const aFilters = this.getGlobalDateFilter();
      // Filter locked user
      const aLockedFilters = [
        ...aFilters,
        new Filter("EventId", FilterOperator.EQ, "AUM"),
      ];

      const data = await OverviewService.getTotalAuthLogs(
        oModel,
        aLockedFilters,
      );

      const oDialogModel = new JSONModel({
        title: "Locked Users",
        items: data.arrayData,
      });

      if (!this._oCommomListDialog) {
        // Load fragment
        this._oCommomListDialog = (await Fragment.load({
          id: this.getView()?.getId(),
          name: "useractivitymonitorapplication.fragment.CommonListDialog",
          controller: this,
        })) as Dialog;

        this.getView()?.addDependent(this._oCommomListDialog);
      }

      this._oCommomListDialog.setModel(oDialogModel, "dialogModel");

      this._oCommomListDialog?.open();
    });
  }

  public onCloseCommonDialog(): void {
    this._oCommomListDialog?.close();
  }

  // ===========================================
  // Show fragment total user
  // ===========================================
  public async onShowTotalUsers(): Promise<void> {
    await this.withBusy(async () => {
      const oModel = this.getAppComponent().getModel() as ODataModel;

      // Filter globlal date
      const aFilters = this.getGlobalDateFilter();

      const data = await OverviewService.getTotalAuthLogs(oModel, aFilters);

      const oDialogModel = new JSONModel({
        title: "Total Users",
        items: data.arrayData,
      });

      if (!this._oCommomListDialog) {
        // Load fragment
        this._oCommomListDialog = (await Fragment.load({
          id: this.getView()?.getId(),
          name: "useractivitymonitorapplication.fragment.CommonListDialog",
          controller: this,
        })) as Dialog;

        this.getView()?.addDependent(this._oCommomListDialog);
      }

      this._oCommomListDialog.setModel(oDialogModel, "dialogModel");

      this._oCommomListDialog?.open();
    });
  }

  // ===========================================
  // Show fragment total dump
  // ===========================================
  public async onShowTotalDump(): Promise<void> {
    await this.withBusy(async () => {
      const oModel = this.getAppComponent().getModel() as ODataModel;

      // Filter globlal date
      const { from, to } = this.getGlobalDateRange();

      // Filter dump count
      const aDumpFilters = [
        new Filter("ActDate", FilterOperator.BT, from, to),
        new Filter("ActType", FilterOperator.EQ, "DUMP"),
      ];

      const data = await OverviewService.getTotalDump(oModel, aDumpFilters);
      const oDumpDataModel = new JSONModel(data.arrayData);

      if (!this._oDumpListDialog) {
        // Load fragment
        this._oDumpListDialog = (await Fragment.load({
          id: this.getView()?.getId(),
          name: "useractivitymonitorapplication.fragment.DetailDumpsDialog",
          controller: this,
        })) as Dialog;

        this.getView()?.addDependent(this._oDumpListDialog);
      }

      this._oDumpListDialog.setModel(oDumpDataModel, "dumpDialogData");

      this._oDumpListDialog?.open();
    });
  }

  public onCloseDumpDialog(): void {
    this._oDumpListDialog?.close();
  }

  // ===========================================
  // Show fragment login fail
  // ===========================================
  public async onShowLogFail(): Promise<void> {
    await this.withBusy(async () => {
      const oModel = this.getAppComponent().getModel() as ODataModel;

      // Filter globlal date
      const aFilters = this.getGlobalDateFilter();

      // Filter dump count
      const aLogFailFilters = [
        ...aFilters,
        new Filter("LoginResult", FilterOperator.EQ, "FAIL"),
      ];

      const data = await OverviewService.getTotalAuthLogs(
        oModel,
        aLogFailFilters,
      );
      const oLogFailDataModel = new JSONModel(data.arrayLogFail);

      if (!this._oLogFailDialog) {
        // Load fragment
        this._oLogFailDialog = (await Fragment.load({
          id: this.getView()?.getId(),
          name: "useractivitymonitorapplication.fragment.DetailLogFailDialog",
          controller: this,
        })) as Dialog;

        this.getView()?.addDependent(this._oLogFailDialog);
      }

      this._oLogFailDialog.setModel(oLogFailDataModel, "logFailData");

      this._oLogFailDialog?.open();
    });
  }

  // ===========================================
  // Scroll to table
  // ===========================================
  public onCloseLogFailDialog(): void {
    this._oLogFailDialog?.close();
  }

  public onScrollToTable(): void {
    const oTable = this.byId("MaiTableId");

    if (oTable) {
      const oDomRef = oTable.getDomRef();

      if (oDomRef) {
        oDomRef.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }
    }
  }
}
