import Formatter from "useractivitymonitorapplication/formatter/Formatter";
import BaseController from "./Base.controller";
import Dialog from "sap/m/Dialog";
import AuthenticateDetailService from "useractivitymonitorapplication/services/AuthenticateDetailService";
import ODataModel from "sap/ui/model/odata/v4/ODataModel";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import JSONModel from "sap/ui/model/json/JSONModel";
import Fragment from "sap/ui/core/Fragment";
import Spreadsheet from "sap/ui/export/Spreadsheet";
import MessageBox from "sap/m/MessageBox";

export default class AuthDetail extends BaseController {
  public formatter = Formatter;

  private _oActViewSettingsDialog: Dialog | null = null;
  private _oTCodeSearchHelpDialog: Dialog | null = null;

  private _sUsername: string = "";

  // ===========================================
  // Called when the controller is initialized.
  // ===========================================
  public onInit(): void {
    super.onInit();

    const oRouter = (this as any).getAppComponent().getRouter();
    if (oRouter) {
      oRouter
        .getRoute("AuthDetail")
        .attachPatternMatched(this._onObjectMatched, this);
    }
  }

  // =================================================
  // Handles route matching for AuthDetail page
  // and loads detail data based on the navigation key.
  // =================================================
  private async _onObjectMatched(oEvent: any): Promise<void> {
    // Get parameter from URL
    const sSessionId = oEvent.getParameter("arguments").key;

    this._sUsername = sSessionId;

    const oView = this.getView();
    if (!oView || !sSessionId) return;

    oView.setBusy(true);

    const oModel = this.getAppComponent().getModel() as ODataModel;
    const aFilters = [new Filter("SessionId", FilterOperator.EQ, sSessionId)];

    try {
      const [detailData] = await Promise.all([
        // Call fn getAuthDetailData
        AuthenticateDetailService.getAuthDetailData(oModel, aFilters),
      ]);
      const oDetailModel = new JSONModel(detailData[0].getObject());
      oView.setModel(oDetailModel, "detailData");
    } catch (error: any) {
      this.showError(error.message || "Failed to authenticate detail data");
    } finally {
      oView.setBusy(false);
    }
  }

  // ===========================================
  // User Filter Activity Type
  // ===========================================
  public onFilterActivity(): void {
    this.onApplyFilters();
  }

  // ===========================================
  // Apply filter to table
  // ===========================================
  public async onApplyFilters(): Promise<void> {
    const aFilters = [];

    // Filter by TCode
    const sTCodeSearch = (this.byId("activityTCodeFilter") as any).getValue();
    if (sTCodeSearch) {
      aFilters.push(new Filter("Tcode", FilterOperator.Contains, sTCodeSearch));
    }

    // Filter by Activity Type
    const sActivityType = (
      this.byId("activityTypeFilter") as any
    ).getSelectedKey();
    if (sActivityType) {
      aFilters.push(new Filter("ActType", FilterOperator.EQ, sActivityType));
    }

    // Execute filter on the Table
    const oTable = this.byId("ActivityTable") as any;
    const oBinding = oTable?.getBinding("rows") || oTable?.getBinding("items");

    if (oBinding) {
      oBinding.filter(aFilters);
    }
  }

  // ===========================================
  // Open TCode Search Help
  // ===========================================
  public async onUserSearchHelpTCode(): Promise<void> {
    try {
      if (!this._oTCodeSearchHelpDialog) {
        this._oTCodeSearchHelpDialog = (await Fragment.load({
          id: this.getView()?.getId(),
          name: "useractivitymonitorapplication.fragment.TCodeSearchHelp",
          controller: this,
        })) as Dialog;
        this.getView()?.addDependent(this._oTCodeSearchHelpDialog);
      }

      // Get loaded activities from detail model
      const oDetailModel = this.getView()?.getModel("detailData") as JSONModel;

      if (oDetailModel) {
        const aActivities = oDetailModel.getProperty("/_Activity") || [];
        const oTCodeSearchHelpData: any = {};

        // Extract unique TCodes
        aActivities.forEach((oAct: any) => {
          const sTCode = oAct.Tcode;
          if (sTCode && !oTCodeSearchHelpData[sTCode]) {
            oTCodeSearchHelpData[sTCode] = {
              Tcode: sTCode,
            };
          }
        });

        // Bind unique TCodes to dialog model
        const aTCodeSearchHelpData = Object.values(oTCodeSearchHelpData);
        const oJsonModel = new JSONModel(aTCodeSearchHelpData);
        this.getView()?.setModel(oJsonModel, "TCodeSeachHelp");
      }

      this._oTCodeSearchHelpDialog.open();
    } catch (error) {
      this.showError("Failed to load TCode search help.");
    }
  }

  // =================================================
  // User Selected Data from TCode Search Help List
  // =================================================
  public onTCodeSelect(oEvent: any): void {
    const oItem = oEvent.getParameter("listItem");
    const oContext = oItem.getBindingContext("TCodeSeachHelp");
    const oSelected = oContext?.getObject();
    debugger;
    if (oSelected) {
      (this.byId("activityTCodeFilter") as any).setValue(oSelected.Tcode);

      this.onApplyFilters();
    }

    this.onCloseTCodeDialog();
  }

  public onCloseTCodeDialog(): void {
    this._oTCodeSearchHelpDialog?.close();
  }

  // =================================================
  // Export data
  // =================================================
  public onExportActivityExcel(): void {
    const sFileName = `ActivityLogs_of_${this._sUsername}.xlsx`;

    MessageBox.confirm("Do you want to export this data to Excel?", {
      title: "Confirm Export",
      actions: ["YES", "NO"],
      emphasizedAction: "YES",

      onClose: (oAction: string | null) => {
        if (oAction === "YES") {
          const oTable = this.byId("ActivityTable") as any;

          const aData = oTable.getModel("detailData").getProperty("/_Activity");

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
            dataSource: aData,
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
    const oTable = this.byId("ActivityTable") as any;
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
    const oTable = this.byId("ActivityTable") as any;
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
}
