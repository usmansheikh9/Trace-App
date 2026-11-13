using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace Trace.Infrastructure.Data.Migrations
{
    /// <summary>
    /// Adds Sessions and Workflows and renames Copies to Boxes, preserving data.
    /// Hand-written: EF would scaffold the Copy -> Box rename as drop + create (data loss),
    /// so the table, column, constraint and index renames are done in place. Existing boxes
    /// and non-admin users move into a "Default Session" (Received -> Cut -> Packed), created
    /// only when there is data to hold; a fresh database gets its session from the dev seeder.
    /// </summary>
    public partial class SessionsAndBoxes : Migration
    {
        private const string DefaultSession = "Default Session";

        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. New tables.
            migrationBuilder.CreateTable(
                name: "sessions",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    name = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_sessions", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "ix_sessions_name",
                table: "sessions",
                column: "name",
                unique: true);

            migrationBuilder.CreateTable(
                name: "workflow_stages",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    session_id = table.Column<int>(type: "integer", nullable: false),
                    stage_name = table.Column<string>(type: "text", nullable: false),
                    position = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_workflow_stages", x => x.id);
                    table.ForeignKey(
                        name: "fk_workflow_stages_sessions_session_id",
                        column: x => x.session_id,
                        principalTable: "sessions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_workflow_stages_session_id_position",
                table: "workflow_stages",
                columns: new[] { "session_id", "position" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_workflow_stages_session_id_stage_name",
                table: "workflow_stages",
                columns: new[] { "session_id", "stage_name" },
                unique: true);

            // 2. copies -> boxes, in place (rows, ids and the identity sequence carry over).
            migrationBuilder.DropForeignKey(
                name: "fk_scan_records_copies_copy_id",
                table: "scan_records");

            migrationBuilder.RenameTable(name: "copies", newName: "boxes");
            migrationBuilder.Sql("ALTER TABLE boxes RENAME CONSTRAINT pk_copies TO pk_boxes;");
            migrationBuilder.Sql("ALTER SEQUENCE IF EXISTS copies_id_seq RENAME TO boxes_id_seq;");
            migrationBuilder.RenameIndex(name: "ix_copies_copynumber", table: "boxes", newName: "ix_boxes_copynumber");

            // 3. scan_records.copy_id -> box_id.
            migrationBuilder.RenameColumn(name: "copy_id", table: "scan_records", newName: "box_id");
            migrationBuilder.RenameIndex(
                name: "ix_scan_records_copy_id_stage",
                table: "scan_records",
                newName: "ix_scan_records_box_id_stage");
            migrationBuilder.AddForeignKey(
                name: "fk_scan_records_boxes_box_id",
                table: "scan_records",
                column: "box_id",
                principalTable: "boxes",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            // 4. Session columns, nullable while existing rows are backfilled.
            migrationBuilder.AddColumn<int>(name: "session_id", table: "boxes", type: "integer", nullable: true);
            migrationBuilder.AddColumn<int>(name: "session_id", table: "users", type: "integer", nullable: true);

            // 5. Default session for existing data: its workflow, its boxes, its (non-admin) users.
            migrationBuilder.Sql($"""
                INSERT INTO sessions (name, is_active, created_at, updated_at)
                SELECT '{DefaultSession}', true, now(), now()
                WHERE EXISTS (SELECT 1 FROM boxes) OR EXISTS (SELECT 1 FROM users WHERE NOT is_admin);

                INSERT INTO workflow_stages (session_id, stage_name, position)
                SELECT s.id, v.stage_name, v.position
                FROM sessions s
                CROSS JOIN (VALUES ('Received', 1), ('Cut', 2), ('Packed', 3)) AS v(stage_name, position)
                WHERE s.name = '{DefaultSession}';

                UPDATE boxes SET session_id = (SELECT id FROM sessions WHERE name = '{DefaultSession}');
                UPDATE users SET session_id = (SELECT id FROM sessions WHERE name = '{DefaultSession}') WHERE NOT is_admin;
                """);

            // 6. Every box belongs to a session.
            migrationBuilder.AlterColumn<int>(
                name: "session_id",
                table: "boxes",
                type: "integer",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "integer",
                oldNullable: true);

            migrationBuilder.CreateIndex(name: "ix_boxes_session_id", table: "boxes", column: "session_id");
            migrationBuilder.CreateIndex(name: "ix_users_session_id", table: "users", column: "session_id");

            migrationBuilder.AddForeignKey(
                name: "fk_boxes_sessions_session_id",
                table: "boxes",
                column: "session_id",
                principalTable: "sessions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_users_sessions_session_id",
                table: "users",
                column: "session_id",
                principalTable: "sessions",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Reverse of Up. Session assignments and workflows are dropped; boxes and scans stay.
            migrationBuilder.DropForeignKey(name: "fk_users_sessions_session_id", table: "users");
            migrationBuilder.DropForeignKey(name: "fk_boxes_sessions_session_id", table: "boxes");
            migrationBuilder.DropIndex(name: "ix_users_session_id", table: "users");
            migrationBuilder.DropIndex(name: "ix_boxes_session_id", table: "boxes");
            migrationBuilder.DropColumn(name: "session_id", table: "users");
            migrationBuilder.DropColumn(name: "session_id", table: "boxes");

            migrationBuilder.DropForeignKey(name: "fk_scan_records_boxes_box_id", table: "scan_records");
            migrationBuilder.RenameIndex(
                name: "ix_scan_records_box_id_stage",
                table: "scan_records",
                newName: "ix_scan_records_copy_id_stage");
            migrationBuilder.RenameColumn(name: "box_id", table: "scan_records", newName: "copy_id");

            migrationBuilder.RenameIndex(name: "ix_boxes_copynumber", table: "boxes", newName: "ix_copies_copynumber");
            migrationBuilder.Sql("ALTER SEQUENCE IF EXISTS boxes_id_seq RENAME TO copies_id_seq;");
            migrationBuilder.Sql("ALTER TABLE boxes RENAME CONSTRAINT pk_boxes TO pk_copies;");
            migrationBuilder.RenameTable(name: "boxes", newName: "copies");

            migrationBuilder.AddForeignKey(
                name: "fk_scan_records_copies_copy_id",
                table: "scan_records",
                column: "copy_id",
                principalTable: "copies",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.DropTable(name: "workflow_stages");
            migrationBuilder.DropTable(name: "sessions");
        }
    }
}
