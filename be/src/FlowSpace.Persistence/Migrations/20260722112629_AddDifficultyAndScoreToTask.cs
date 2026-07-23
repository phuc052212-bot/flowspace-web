using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FlowSpace.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddDifficultyAndScoreToTask : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "CompletionScore",
                table: "Tasks",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Difficulty",
                table: "Tasks",
                type: "character varying(50)",
                maxLength: 50,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CompletionScore",
                table: "Tasks");

            migrationBuilder.DropColumn(
                name: "Difficulty",
                table: "Tasks");
        }
    }
}
