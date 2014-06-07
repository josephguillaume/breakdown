
## get all variables used in R expressions eq
getTerms <- function(eq,...) all.vars(parse(text=eq),...)

## Variables that are never referenced in equations
## either named list/vector of equations or matrix with first column names of variables
## matrix form identifies variables not referenced in any of the columns
getTop <- function(equations,...,ignore=FALSE) {
  if(is.matrix(equations)){ 
    vals <- setdiff(equations[,1],getTerms(equations[,-1],...))
    if(ignore){
      ## If it has no descendants in any column
      vals <- vals[sapply(vals,function(v) length(getTerms(equations[equations[,1]==v,-1]))!=0)]
    }
  }  else if(is.list(equations) || is.character(equations)){
    vals <- setdiff(names(equations),getTerms(equations,...))
    if(ignore){
      ## If it has no descendants
      vals <- vals[sapply(vals,function(v) length(getTerms(equations[v]))!=0)]
    }
  } else {
    stop("equations not a list or matrix")
  }
  return(vals)
}

## Variables that do not reference any other variables
getBottom <- function(equations,...) {
  if(is.matrix(equations)) return(equations[apply(equations[,-1],1,function(x) length(getTerms(x))==0),1])
  if(is.list(equations)||is.character(equations)) return(names(equations)[sapply(equations,function(x) length(getTerms(x))==0)])
}

## get expressions necessary for evaluating the equation for var
## equations is named list/vector
## or in matrix form, all expressions necessary for any of the columns
## returns matrix or list
getSubset <- function(equations,var){
  if(is.matrix(equations)){
    if(!var %in% equations[,1]) return(NULL)
    row=equations[equations[,1]==var,,drop=FALSE]
    children <- getTerms(row[-1],functions=TRUE)
    if(row[,1] %in% children) stop(sprintf("%s is its own child",row[,1]))
    return(unique(do.call(rbind,c(
      list(row),
      lapply(children,function(x) getSubset(equations,x))
    ))))
  }
  equations=as.list(equations)
  if(!var %in% names(equations)) return(NULL)
  row=equations[var]
  children <- getTerms(row,functions=TRUE)
  sub <- do.call(c,c(
    list(row),
    lapply(children,function(x) getSubset(equations,x))
  ))
  sub<-sub[!duplicated(names(sub))]
  return(sub)
} 
