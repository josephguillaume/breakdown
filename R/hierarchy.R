getChildren <- function(equations,id=NULL,name,showEquation=FALSE){
  if(is.null(id) || id=="0") {
    obj <- getTop(equations)
    id=""
  } else {
    obj <- getTerms(equations[equations[,1]==name,-1])
  }
  obj <- lapply(obj,getNode,id=id,equations=equations,showEquation=showEquation)
  return(obj)
}

## return equation/value for variable n
getNode <- function(n,equations,id,showEquation=TRUE){
  if(!n %in% equations[,1]){
    ## Allow new variables, setting default value to ""
    obj <- as.list(rep("",ncol(equations)-1))
  } else{
    obj<-as.list(equations[equations[,1]==n,-1])
  }
  names(obj)<-make.names(1:(ncol(equations)-1))
  
  ## TODO: keep expanded state on reload - open ids need to be passed
  if(any(sapply(obj,function(x) length(getTerms(x)))>0))
    obj$state="closed"
  
  obj$name <- n
  obj$id <- paste(id,n,sep="_")
  
  if(!showEquation){
    for(v in 1:(ncol(equations)-1)){
      eqs=equations[,v+1]
      names(eqs)=equations[,1]
      ## Continue if value can't be calculated
      val <- try(evaluate(obj[[v]],eqs))
      if(length(val)>1) {
        obj[[v]] <- capture.output(dput(as.list(val),control=c()))
      } else {
        obj[[v]] <- capture.output(dput(try(val)))
      }
    }
  }
  obj
}
