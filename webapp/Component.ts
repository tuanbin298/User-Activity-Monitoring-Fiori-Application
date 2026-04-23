import BaseComponent from "sap/fe/core/AppComponent";
import JSONModel from "sap/ui/model/json/JSONModel";

/**
 * @namespace useractivitymonitorapplication
 */
export default class Component extends BaseComponent {
  public static metadata = {
    manifest: "json",
  };

  /**
   * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
   * @public
   * @override
   */
  public init(): void {
    super.init();

    // SET GLOBAL FILTER DATE
    const oToday = new Date();

    const iDay = oToday.getDay();

    // Calculate distance to Monday
    const iDiffToMonday = iDay === 0 ? -6 : 1 - iDay;

    const oFrom = new Date(oToday);
    oFrom.setDate(oToday.getDate() + iDiffToMonday);

    const oTo = new Date(oFrom);
    oTo.setDate(oFrom.getDate() + 5);

    const oGlobalModel = new JSONModel({
      fromDate: oFrom,
      toDate: oTo,
    });

    this.setModel(oGlobalModel, "globalFilterDate");
  }
}
