using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Trace.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class UniqueScanPerStage : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Duplicates were allowed before this rule; keep the earliest record per (copy, stage).
            migrationBuilder.Sql("""
                DELETE FROM scan_records s
                USING scan_records keep
                WHERE s.copy_id = keep.copy_id
                  AND s.stage = keep.stage
                  AND (keep.created_at, keep.id) < (s.created_at, s.id);
                """);

            migrationBuilder.DropIndex(
                name: "ix_scan_records_copy_id",
                table: "scan_records");

            migrationBuilder.CreateIndex(
                name: "ix_scan_records_copy_id_stage",
                table: "scan_records",
                columns: new[] { "copy_id", "stage" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_scan_records_copy_id_stage",
                table: "scan_records");

            migrationBuilder.CreateIndex(
                name: "ix_scan_records_copy_id",
                table: "scan_records",
                column: "copy_id");
        }
    }
}
