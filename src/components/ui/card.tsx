const Card = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="border rounded-lg">
            {children}
        </div>
    )
}

export default Card