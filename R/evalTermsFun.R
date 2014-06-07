## Create a function that returns the value of a variable given a set of arguments
## equations is a named character vector (or list)
## var is one of the variable names
evalTermsFun <- function(equations,var,subset.args=TRUE){
  if(is.list(equations)) equations=as.character(equations)
  ## Run for each column separately
  if(is.matrix(equations)){
    fs=lapply(2:ncol(equations),function(i) {
      eqs=equations[,i]
      names(eqs)=equations[,1]
      evalTermsFun(eqs,var,subset.args)
    })
    if(length(fs)==1) return(fs[[1]])
    return(fs)
  }
  ## Recursive function to obtain assignments in necessary order
  getParse <- function(equations){
    top=getTop(equations,functions=TRUE)
    if(length(top)==0) return(NULL)
    else return(c(
      getParse(equations[!names(equations) %in% top]),
      sprintf("if(is.null(%s)) %s <- %s",top,top,equations[top])
    ))
  }
  ## Only equations necessary to calculate var
  if(subset.args) equations <- getSubset(equations,var)
  equations <- equations[equations!=""]
  ## Get ordered expressions, removing later duplicates
  code <- getParse(equations)
  code <- code[!duplicated(code)]
  ## Treat numerical variables as arguments to the function only
  bottom <- getBottom(equations)
  code <- code[!code %in% sprintf("if(is.null(%s)) %s <- %s",bottom,bottom,equations[bottom])]
  args <- equations[bottom]
  args <- sapply(args,function(x) paste(deparse(parse(text=x),control=NULL),collapse=""))
  ## TODO: seems a bit of a hack
  args <- gsub("expression\\((.*)\\)","\\1",args)
  other <- setdiff(names(equations),bottom)
  ## Create function as text
  code <- c(sprintf("function(%s){",
                    paste(sprintf("%s=%s",
                                  c(names(args),other),
                                  c(args,rep("NULL",length(other)))),
                                  collapse=",")),
            code,
            sprintf("return(%s)}",var)
  )
  ## Parse and compile
  f <- eval(parse(text=paste(code,collapse="\n")))
  return(cmpfun(f))
}
