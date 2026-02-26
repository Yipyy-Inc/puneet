"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Package,
  Users,
  ShoppingBag,
  Download,
  Calendar,
  Award,
  Percent,
} from "lucide-react";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import {
  getSalesByPeriod,
  getTopProducts,
  getProfitMarginReport,
  getSalesByStaff,
  getSalesByCategory,
  getSalesLinkedToServices,
  type SalesByPeriod,
  type TopProduct,
  type ProfitMarginReport,
  type SalesByStaff,
  type SalesByCategory,
  type SalesLinkedToServices,
} from "@/lib/retail-reports";
import { getAllTransactions, type Transaction } from "@/data/retail";
import { 
  getPaymentMethodLabel, 
  formatTransactionTimestamp,
  getLocationName,
} from "@/lib/payment-method-utils";
import { Smartphone, Printer, CreditCard, Banknote, Wallet, Gift, MapPin, Clock, User as UserIcon, Link as LinkIcon } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function RetailReportsPage() {
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "custom">(
    "30d"
  );
  const [period, setPeriod] = useState<"day" | "week" | "month">("day");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [topProductsLimit, setTopProductsLimit] = useState<number>(10);
  const [topProductsSortBy, setTopProductsSortBy] = useState<
    "revenue" | "quantity"
  >("revenue");

  // Calculate date range
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    let start: Date;

    if (dateRange === "custom") {
      start = customStartDate ? new Date(customStartDate) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
      const customEnd = customEndDate ? new Date(customEndDate) : end;
      return { startDate: start, endDate: customEnd };
    }

    const days = dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90;
    start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);
    return { startDate: start, endDate: end };
  }, [dateRange, customStartDate, customEndDate]);

  // Fetch report data
  const salesByPeriod = useMemo(
    () => getSalesByPeriod(period, startDate, endDate),
    [period, startDate, endDate]
  );

  const topProducts = useMemo(
    () => getTopProducts(topProductsLimit, topProductsSortBy, startDate, endDate),
    [topProductsLimit, topProductsSortBy, startDate, endDate]
  );

  const profitMarginReport = useMemo(
    () => getProfitMarginReport(period, startDate, endDate),
    [period, startDate, endDate]
  );

  const salesByStaff = useMemo(
    () => getSalesByStaff(startDate, endDate),
    [startDate, endDate]
  );

  const salesByCategory = useMemo(
    () => getSalesByCategory(startDate, endDate),
    [startDate, endDate]
  );

  const salesLinkedToServices = useMemo(
    () => getSalesLinkedToServices(startDate, endDate),
    [startDate, endDate]
  );

  // Calculate totals
  const totalSales = salesByPeriod.reduce((sum, item) => sum + item.sales, 0);
  const totalTransactions = salesByPeriod.reduce(
    (sum, item) => sum + item.transactions,
    0
  );
  const totalItems = salesByPeriod.reduce((sum, item) => sum + item.items, 0);
  const totalProfit = profitMarginReport.reduce(
    (sum, item) => sum + item.profit,
    0
  );
  const averageProfitMargin =
    profitMarginReport.length > 0
      ? profitMarginReport.reduce((sum, item) => sum + item.profitMargin, 0) /
        profitMarginReport.length
      : 0;

  // Column definitions
  const topProductsColumns: ColumnDef<TopProduct>[] = [
    {
      key: "productName",
      label: "Product",
      defaultVisible: true,
      render: (item) => (
        <div>
          <div className="font-medium">{item.productName}</div>
          {item.variantName && (
            <div className="text-sm text-muted-foreground">
              {item.variantName}
            </div>
          )}
          <div className="text-xs text-muted-foreground">SKU: {item.sku}</div>
        </div>
      ),
    },
    {
      key: "quantitySold",
      label: "Quantity Sold",
      defaultVisible: true,
      render: (item) => (
        <span className="font-medium">{item.quantitySold}</span>
      ),
    },
    {
      key: "revenue",
      label: "Revenue",
      defaultVisible: true,
      render: (item) => `$${item.revenue.toFixed(2)}`,
    },
    {
      key: "cost",
      label: "Cost",
      defaultVisible: true,
      render: (item) => `$${item.cost.toFixed(2)}`,
    },
    {
      key: "profit",
      label: "Profit",
      defaultVisible: true,
      render: (item) => (
        <span
          className={item.profit >= 0 ? "text-green-600" : "text-red-600"}
        >
          ${item.profit.toFixed(2)}
        </span>
      ),
    },
    {
      key: "profitMargin",
      label: "Margin",
      defaultVisible: true,
      render: (item) => (
        <Badge
          variant={item.profitMargin >= 30 ? "default" : "secondary"}
          className="gap-1"
        >
          {item.profitMargin.toFixed(1)}%
        </Badge>
      ),
    },
  ];

  const salesByStaffColumns: ColumnDef<SalesByStaff>[] = [
    {
      key: "staffName",
      label: "Staff Member",
      defaultVisible: true,
    },
    {
      key: "transactions",
      label: "Transactions",
      defaultVisible: true,
    },
    {
      key: "itemsSold",
      label: "Items Sold",
      defaultVisible: true,
    },
    {
      key: "revenue",
      label: "Revenue",
      defaultVisible: true,
      render: (item) => `$${item.revenue.toFixed(2)}`,
    },
    {
      key: "averageTransaction",
      label: "Avg Transaction",
      defaultVisible: true,
      render: (item) => `$${item.averageTransaction.toFixed(2)}`,
    },
  ];

  const salesByCategoryColumns: ColumnDef<SalesByCategory>[] = [
    {
      key: "category",
      label: "Category",
      defaultVisible: true,
    },
    {
      key: "transactions",
      label: "Transactions",
      defaultVisible: true,
    },
    {
      key: "itemsSold",
      label: "Items Sold",
      defaultVisible: true,
    },
    {
      key: "revenue",
      label: "Revenue",
      defaultVisible: true,
      render: (item) => `$${item.revenue.toFixed(2)}`,
    },
    {
      key: "profit",
      label: "Profit",
      defaultVisible: true,
      render: (item) => (
        <span className={item.profit >= 0 ? "text-green-600" : "text-red-600"}>
          ${item.profit.toFixed(2)}
        </span>
      ),
    },
    {
      key: "profitMargin",
      label: "Margin",
      defaultVisible: true,
      render: (item) => (
        <Badge
          variant={item.profitMargin >= 30 ? "default" : "secondary"}
          className="gap-1"
        >
          {item.profitMargin.toFixed(1)}%
        </Badge>
      ),
    },
  ];

  const salesLinkedToServicesColumns: ColumnDef<SalesLinkedToServices>[] = [
    {
      key: "serviceType",
      label: "Service Type",
      defaultVisible: true,
      render: (item) => (
        <Badge variant="outline" className="capitalize">
          {item.serviceType}
        </Badge>
      ),
    },
    {
      key: "transactions",
      label: "Transactions",
      defaultVisible: true,
    },
    {
      key: "itemsSold",
      label: "Items Sold",
      defaultVisible: true,
    },
    {
      key: "revenue",
      label: "Revenue",
      defaultVisible: true,
      render: (item) => `$${item.revenue.toFixed(2)}`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Retail Reports</h2>
          <p className="text-muted-foreground">
            Comprehensive sales, inventory, and performance analytics
          </p>
        </div>
        <Button>
          <Download className="h-4 w-4 mr-2" />
          Export All Reports
        </Button>
      </div>

      {/* Date Range Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Date Range</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label>Period:</Label>
              <Select
                value={dateRange}
                onValueChange={(value) =>
                  setDateRange(value as "7d" | "30d" | "90d" | "custom")
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {dateRange === "custom" && (
              <>
                <div className="flex items-center gap-2">
                  <Label>Start:</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-40"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label>End:</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-40"
                  />
                </div>
              </>
            )}

            <div className="flex items-center gap-2">
              <Label>Group By:</Label>
              <Select
                value={period}
                onValueChange={(value) =>
                  setPeriod(value as "day" | "week" | "month")
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Day</SelectItem>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalSales.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {totalTransactions} transactions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Sold</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalItems}</div>
            <p className="text-xs text-muted-foreground">Total units</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalProfit.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {averageProfitMargin.toFixed(1)}% avg margin
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${totalTransactions > 0 ? (totalSales / totalTransactions).toFixed(2) : "0.00"}
            </div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>
      </div>

      {/* Reports Tabs */}
      <Tabs defaultValue="sales" className="space-y-4">
        <TabsList>
          <TabsTrigger value="sales">Sales by Period</TabsTrigger>
          <TabsTrigger value="products">Top Products</TabsTrigger>
          <TabsTrigger value="profit">Profit Margin</TabsTrigger>
          <TabsTrigger value="staff">Sales by Staff</TabsTrigger>
          <TabsTrigger value="category">Sales by Category</TabsTrigger>
          <TabsTrigger value="services">Linked to Services</TabsTrigger>
          <TabsTrigger value="reconciliation">Reconciliation</TabsTrigger>
        </TabsList>

        {/* Sales by Period */}
        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales by {period.charAt(0).toUpperCase() + period.slice(1)}</CardTitle>
              <CardDescription>
                Revenue and transaction trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={salesByPeriod}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      if (period === "day") {
                        return new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        });
                      } else if (period === "week") {
                        return `Week of ${new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
                      } else {
                        return value;
                      }
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value: unknown) => {
                      const numValue = typeof value === 'number' ? value : 0;
                      return `$${numValue.toFixed(2)}`;
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#8884d8"
                    name="Sales ($)"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="transactions"
                    stroke="#82ca9d"
                    name="Transactions"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Products */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Top Products</CardTitle>
                  <CardDescription>
                    Best performing products by {topProductsSortBy}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={topProductsSortBy}
                    onValueChange={(value) =>
                      setTopProductsSortBy(value as "revenue" | "quantity")
                    }
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="revenue">By Revenue</SelectItem>
                      <SelectItem value="quantity">By Quantity</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={String(topProductsLimit)}
                    onValueChange={(value) => setTopProductsLimit(Number(value))}
                  >
                    <SelectTrigger className="w-20">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">Top 10</SelectItem>
                      <SelectItem value="20">Top 20</SelectItem>
                      <SelectItem value="50">Top 50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <DataTable
                data={topProducts}
                columns={topProductsColumns}
                searchKey="productName"
                searchPlaceholder="Search products..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Profit Margin Report */}
        <TabsContent value="profit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profit Margin Report</CardTitle>
              <CardDescription>
                Revenue, cost, and profit analysis by {period}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={profitMarginReport}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="period"
                    tickFormatter={(value) => {
                      if (period === "day") {
                        return new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        });
                      } else if (period === "week") {
                        return `Week of ${new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
                      } else {
                        return value;
                      }
                    }}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value: unknown) => {
                      const numValue = typeof value === 'number' ? value : 0;
                      return `$${numValue.toFixed(2)}`;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="revenue" fill="#8884d8" name="Revenue" />
                  <Bar dataKey="cost" fill="#ffc658" name="Cost" />
                  <Bar dataKey="profit" fill="#82ca9d" name="Profit" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales by Staff */}
        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales by Staff</CardTitle>
              <CardDescription>
                Performance metrics by cashier/staff member
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={salesByStaff}
                columns={salesByStaffColumns}
                searchKey="staffName"
                searchPlaceholder="Search staff..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales by Category */}
        <TabsContent value="category" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales by Category</CardTitle>
              <CardDescription>
                Revenue and profit breakdown by product category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable
                data={salesByCategory}
                columns={salesByCategoryColumns}
                searchKey="category"
                searchPlaceholder="Search categories..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Linked to Services */}
        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Linked to Services</CardTitle>
              <CardDescription>
                Retail items sold as add-ons to services (grooming, boarding, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {salesLinkedToServices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No sales linked to services in this period
                </div>
              ) : (
                <DataTable
                  data={salesLinkedToServices}
                  columns={salesLinkedToServicesColumns}
                  searchKey="serviceType"
                  searchPlaceholder="Search services..."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reconciliation Report */}
        <TabsContent value="reconciliation" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Transaction Reconciliation</CardTitle>
              <CardDescription>
                Detailed transaction report with payment methods, processor IDs, staff, location, and timestamps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ReconciliationTable 
                startDate={startDate} 
                endDate={endDate} 
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Reconciliation Table Component
function ReconciliationTable({ 
  startDate, 
  endDate 
}: { 
  startDate: Date; 
  endDate: Date;
}) {
  const transactions = useMemo(() => {
    const all = getAllTransactions();
    return all.filter((txn) => {
      const txnDate = new Date(txn.createdAt);
      return txnDate >= startDate && txnDate <= endDate && txn.status === "completed";
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [startDate, endDate]);

  const reconciliationColumns: ColumnDef<Transaction>[] = [
    {
      key: "transactionNumber",
      label: "Transaction #",
      defaultVisible: true,
      render: (item) => (
        <span className="font-mono font-medium">{item.transactionNumber}</span>
      ),
    },
    {
      key: "timestamp",
      label: "Timestamp",
      icon: Clock,
      defaultVisible: true,
      render: (item) => {
        const txn = item as Transaction;
        return (
          <div className="flex flex-col">
            <span>{formatTransactionTimestamp(txn.createdAt)}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(txn.createdAt).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>
        );
      },
    },
    {
      key: "paymentMethod",
      label: "Payment Method",
      icon: CreditCard,
      defaultVisible: true,
      render: (item) => {
        const paymentInfo = getPaymentMethodLabel(item as Transaction);
        const PaymentIcon = paymentInfo.icon;
        return (
          <div className="flex items-center gap-2">
            <PaymentIcon className="h-4 w-4 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-medium">{paymentInfo.label}</span>
              {paymentInfo.processor && (
                <span className="text-xs text-muted-foreground">
                  {paymentInfo.processor}
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      key: "processorTransactionId",
      label: "Processor Transaction ID",
      defaultVisible: true,
      render: (item) => {
        const txn = item as Transaction;
        const transactionId = txn.yipyyPayTransactionId || 
                             txn.cloverTransactionId || 
                             txn.fiservTransactionId;
        if (!transactionId) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-col">
            <span className="font-mono text-xs">{transactionId}</span>
            {txn.yipyyPayTransactionId && (
              <Badge variant="outline" className="text-xs w-fit mt-1">Yipyy Pay</Badge>
            )}
            {txn.cloverTransactionId && (
              <Badge variant="outline" className="text-xs w-fit mt-1">Clover</Badge>
            )}
            {txn.fiservTransactionId && !txn.yipyyPayTransactionId && !txn.cloverTransactionId && (
              <Badge variant="outline" className="text-xs w-fit mt-1">Fiserv</Badge>
            )}
          </div>
        );
      },
    },
    {
      key: "staff",
      label: "Staff Member",
      icon: UserIcon,
      defaultVisible: true,
      render: (item) => {
        const txn = item as Transaction;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{txn.cashierName || "Unknown"}</span>
            {txn.cashierId && (
              <span className="text-xs text-muted-foreground">ID: {txn.cashierId}</span>
            )}
          </div>
        );
      },
    },
    {
      key: "location",
      label: "Location",
      icon: MapPin,
      defaultVisible: true,
      render: (item) => {
        const txn = item as Transaction;
        const locationName = getLocationName(txn.locationId);
        return (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>{locationName}</span>
          </div>
        );
      },
    },
    {
      key: "total",
      label: "Amount",
      icon: DollarSign,
      defaultVisible: true,
      render: (item) => `$${(item.total as number).toFixed(2)}`,
    },
    {
      key: "bookingReference",
      label: "Booking/Service",
      icon: LinkIcon,
      defaultVisible: false,
      render: (item) => {
        const txn = item as Transaction;
        if (!txn.bookingId && !txn.bookingService) {
          return <span className="text-muted-foreground">—</span>;
        }
        return (
          <div className="flex flex-col">
            {txn.bookingId && (
              <span className="font-medium">Booking #{txn.bookingId}</span>
            )}
            {txn.bookingService && (
              <span className="text-xs text-muted-foreground capitalize">
                {txn.bookingService}
              </span>
            )}
            {txn.petName && (
              <span className="text-xs text-muted-foreground">
                Pet: {txn.petName}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: "customer",
      label: "Customer",
      defaultVisible: true,
      render: (item) => {
        const txn = item as Transaction;
        return txn.customerName || "Walk-in";
      },
    },
  ];

  return (
    <DataTable
      data={transactions}
      columns={reconciliationColumns}
      searchKey="transactionNumber"
      searchPlaceholder="Search by transaction number, customer, staff..."
    />
  );
}
