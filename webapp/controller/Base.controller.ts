import Controller from "sap/fe/core/PageController";
import MessageBox from "sap/m/MessageBox";
import MessageToast from "sap/m/MessageToast";
import Filter from "sap/ui/model/Filter";
import FilterOperator from "sap/ui/model/FilterOperator";
import JSONModel from "sap/ui/model/json/JSONModel";

export default class BaseController extends Controller {
  // =========================
  // Router
  // =========================
  public getRouter() {
    return (this as any).getAppComponent().getRouter();
  }

  // =========================
  // Model
  // =========================
  public getGlobalModel(): JSONModel {
    return this.getAppComponent().getModel("globalFilterDate") as JSONModel;
  }

  // ====================================================
  // GET Global Date | Apply Global Date into Filter
  // ====================================================
  public getGlobalDateRange() {
    const oGlobalModel = this.getGlobalModel();

    const oFrom = oGlobalModel.getProperty("/fromDate");
    const oTo = oGlobalModel.getProperty("/toDate");

    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");

      return `${year}-${month}-${day}`;
    };

    return {
      from: formatDate(oFrom),
      to: formatDate(oTo),
    };
  }

  public getGlobalDateFilter(path: string = "LoginDate"): Filter[] {
    const { from, to } = this.getGlobalDateRange();

    return [
      new Filter({
        path,
        operator: FilterOperator.BT,
        value1: from,
        value2: to,
      }),
    ];
  }

  // =========================
  // Busy handler
  // =========================
  public async withBusy(fn: Function) {
    const oView = this.getView();
    if (!oView) return;

    oView.setBusy(true);
    try {
      await fn();
    } finally {
      oView.setBusy(false);
    }
  }

  // =========================
  // Message
  // =========================
  public showError(msg: string) {
    MessageBox.error(msg);
  }

  public showSuccess(msg: string) {
    MessageToast.show(msg);
  }

  // =========================
  // PopUp
  // =========================
  public showMessageByState(
    sMessage: string,
    sState: string,
    sTitle?: string,
  ): void {
    const sFinalMessage = sMessage || "No message available";
    const sFinalTitle = sTitle || "Notification";

    switch (sState) {
      case "Success":
        MessageBox.success(sFinalMessage, {
          title: sFinalTitle,
        });
        break;
      case "Error":
        MessageBox.error(sFinalMessage, {
          title: sFinalTitle,
        });
        break;
      default:
        MessageBox.information(sFinalMessage, {
          title: sFinalTitle,
        });
        break;
    }
  }
}
