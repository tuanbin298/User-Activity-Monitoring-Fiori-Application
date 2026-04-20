import ODataListBinding from "sap/ui/model/odata/v4/ODataListBinding";

export default class BaseService {
  // ===========================================
  // Function to call all data of entity
  // ===========================================
  static async _fetchAllData(
    oBinding: ODataListBinding,
    iPageSize: number = 100,
  ) {
    const aAllContexts: any[] = [];
    let iSkip = 0;

    // Loop to fetch data page by page until all data is loaded
    while (true) {
      const aContexts = await oBinding.requestContexts(iSkip, iPageSize);

      // If no data is returned, stop the loop (no more data available)
      if (aContexts.length === 0) break;

      aAllContexts.push(...aContexts);

      // If returned data is less than page size,
      // it means this is the last page → stop the loop
      if (aContexts.length < iPageSize) break;

      iSkip += iPageSize;
    }

    return aAllContexts.map((c) => c.getObject());
  }
}
