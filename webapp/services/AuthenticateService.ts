import Filter from "sap/ui/model/Filter";
import Sorter from "sap/ui/model/Sorter";
import Table from "sap/ui/table/Table";

export default class AuthService {
  // ==================================
  // Call authenticate_data entity
  // Data for authenticate table
  // ==================================
  static bindAuthenticateTable(oTable: Table, aFilters: Filter[]) {
    oTable.bindRows({
      path: "/authenticate_data",
      filters: aFilters,
      parameters: {
        $count: true,
      },
      sorter: [new Sorter("LoginDate", true)],
    });
  }
}
