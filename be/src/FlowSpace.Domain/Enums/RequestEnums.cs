namespace FlowSpace.Domain.Enums
{
    public enum RequestType
    {
        Leave,
        Overtime,
        Purchase,
        Remote
    }

    public enum RequestStatus
    {
        Pending,
        Approved,
        Rejected,
        Cancelled,
        Returned
    }

    public enum ApprovalStatus
    {
        Pending,
        Approved,
        Rejected,
        Returned,
        Forwarded
    }
}
