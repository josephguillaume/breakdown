\name{evaluate}
\alias{evaluate}
\title{
Evaluate an expression
}
\description{
Evaluate an expression that references a set of equations
}
\usage{
evaluate(expr, equations)
}
\arguments{
  \item{expr}{
	A string that will be interpreted as an R expression
}
  \item{equations}{
	A named list of strings representing R expressions, with names corresponding to variables referenced in other expressions
}
}
\value{
Result of evaluating \code{expr}
}
\author{
Joseph Guillaume
}